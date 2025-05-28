import getNextSequence from '@core/services/getNextSequence.js';
import retry from '@core/utils/retry.js';
import { createSyncTask, getSyncTasks, getSyncTaskById } from '@core/services/syncTaskService.js';
import {
  createConnector,
  getConnectorStatus,
  resumeConnector,
  pauseConnector,
} from '@kafka/debeziumControl/services/debeziumService.js';
import { summarizeReplicationStatus, getCombinedConnectionStatus } from './syncTaskUtil.js';
import { ISyncTask, IDebeziumConnectorConfig } from '@core/models/syncTask.model.js';
import {ITable} from '@core/models/table.model.js';
import { IDbConnection } from '@core/models/dbConnection.model.js';
import {ReplicationStatus} from '@core/models/syncTask.model.js';
import { ISyncTaskApi } from '@api/models/syncTasksApi.js';

// --- Type Definitions (if not already in model) ---
type ConnectorType = 'source' | 'sink';

// --- Create Source Connector JSON (MySQL) ---
export const createSourceConnectJson = async (syncTask: ISyncTask): Promise<IDebeziumConnectorConfig> => {
  const { sourceConnection, tables }: { sourceConnection: IDbConnection; tables: ITable[] } = syncTask;
  
  if (!sourceConnection) {
    throw new Error('Missing source connector configuration in syncTask');
  }

  if (!tables) {
    throw new Error('Missing table configuration in syncTask');
  }

  const serverId = await getNextSequence('serverId');
  const kafkaServer = process.env.KAFKA_SERVER;
  const database = sourceConnection.database;

  const selectedTables = tables
    .filter((table) => table.selected)
    .map((table) => `${database}.${table.name}`);

  const getSelectedColumns = (syncTask: ISyncTask, database: string): string => {
    const selectedColumns: string[] = [];
    for (const table of syncTask.tables) {
      if (!table.selected) continue;
      for (const col of table.columns) {
        if (col.selected) {
          selectedColumns.push(`${database}.${table.name}.${col.name}`);
        }
      }
    }
    return selectedColumns.length > 0 ? selectedColumns.join(',') : '';
  };

  return {
    name: sourceConnection.database.replace(/\s+/g, '_').toLowerCase() + '_' + Date.now(),
    config: {
      'connector.class': 'io.debezium.connector.mysql.MySqlConnector',
      'database.hostname': sourceConnection.host,
      'database.port': sourceConnection.port.toString(),
      'database.user': sourceConnection.username,
      'database.password': sourceConnection.password,
      'database.server.id': serverId.toString(),
      'database.server.name': database,
      'database.include.list': database,
      'table.include.list': selectedTables.join(','),
      'column.include.list': getSelectedColumns(syncTask, database),
      'topic.prefix': sourceConnection.host.replace(/\./g, '_'),
      'database.history.kafka.bootstrap.servers': kafkaServer,
      'database.history.kafka.topic': 'dbhistory.' + database,
      'schema.history.internal.kafka.bootstrap.servers': kafkaServer,
      'schema.history.internal.kafka.topic': 'dbhistory.internal.' + database,
      'snapshot.mode': 'initial',
      'snapshot.locking.mode': 'extended',
    },
  };
};

// --- Create Sink Connector JSON (MSSQL) ---
export const createSinkConnectJson = async (syncTask: ISyncTask): Promise<IDebeziumConnectorConfig> => {
  const { sourceConnection, targetConnection, tables } = syncTask;

  if (!sourceConnection) {
    throw new Error('Missing source connector configuration in syncTask');
  }

  if (!targetConnection) {
    throw new Error('Missing Target connector configuration in syncTask');
  }

  if (!tables) {
    throw new Error('Missing table configuration in syncTask');
  }

  const database = sourceConnection.database;
  const selectedTables = tables.filter((table) => table.selected);

  // กำหนดค่า topic prefix (ใช้ชื่อฐานข้อมูลและตาราง)
  const tableTopics = selectedTables.map(
    (table) =>
      `${sourceConnection.host.replace(/\./g, '_')}.${database}.${table.name}`
  );

  return {
    name: targetConnection.database.replace(/\s+/g, '_').toLowerCase() + '_' + Date.now(),
    config: {
      'connector.class': 'io.confluent.connect.jdbc.JdbcSinkConnector',
      'tasks.max': '1',
      'connection.url': `jdbc:sqlserver://${targetConnection.host}:${targetConnection.port.toString()};databaseName=${targetConnection.database}`,
      'connection.user': targetConnection.username,
      'connection.password': targetConnection.password,
      'connection.driver': 'com.microsoft.sqlserver.jdbc.SQLServerDriver',
      'insert.mode': 'upsert',
      'pk.mode': 'record_key',
      'auto.create': 'true',
      'auto.evolve': 'true',
      topics: tableTopics.join(','),
      transforms: 'RenameTopic,unwrap',
      'transforms.RenameTopic.type': 'org.apache.kafka.connect.transforms.RegexRouter',
      'transforms.RenameTopic.regex':
        '([a-zA-Z0-9_]+)\\.([a-zA-Z0-9_]+)\\.(.*)',
      'transforms.RenameTopic.replacement': '$3',
      'transforms.unwrap.type': 'io.debezium.transforms.ExtractNewRecordState',
      'transforms.unwrap.drop.tombstones': 'false',
      'transforms.unwrap.delete.handling.mode': 'rewrite',
      'transforms.unwrap.add.fields': 'op,table',
    },
  };
};

// --- Create Connector JSON (source/sink) ---
export const createConnectJson = async (
  syncTask: ISyncTask,
  connectorType: ConnectorType
): Promise<IDebeziumConnectorConfig> => {
  if (connectorType === 'source') {
    return createSourceConnectJson(syncTask);
  } else if (connectorType === 'sink') {
    return createSinkConnectJson(syncTask);
  } else {
    throw new Error('Invalid connector type');
  }
};


//TODO: ต้องมีการจัดการกรณีที่ไม่มี kafka Connector
// --- Get Sync Tasks API ---
export const getSyncTasksApi = async (): Promise<ISyncTaskApi[]> => {
  const syncTasks = await getSyncTasks();

  const newSyncTasks: ISyncTaskApi[] = await Promise.all(
    syncTasks.map(async (task: ISyncTask & { toObject?: () => ISyncTask }) => {
      const sourceConnectorName = task.sourceConnectorConfig?.name;
      const sinkConnectorName = task.sinkConnectorConfig?.name;

      let sourceStatus: ReplicationStatus = 'onProgress';
      let sinkStatus: ReplicationStatus = 'onProgress';

      try {
        if (sourceConnectorName) {
          const sourceConnector = await getConnectorStatus(sourceConnectorName);
          sourceStatus = summarizeReplicationStatus(sourceConnector);
        }
      } catch (err) {
        console.error(`Error getting source connector "${sourceConnectorName}":`, err);
        sourceStatus = 'error';
      }

      try {
        if (sinkConnectorName) {
          const sinkConnector = await getConnectorStatus(sinkConnectorName);
          sinkStatus = summarizeReplicationStatus(sinkConnector);
        }
      } catch (err) {
        console.error(`Error getting sink connector "${sinkConnectorName}":`, err);
        sinkStatus = 'error';
      }

      task.status = getCombinedConnectionStatus(sourceStatus, sinkStatus);

      const plainTask: Partial<ISyncTask> = typeof task.toObject === 'function'
        ? task.toObject()
        : { ...task };

      delete plainTask.sourceConnectorConfig;
      delete plainTask.sinkConnectorConfig;

      return plainTask as ISyncTaskApi;
    })
  );

  return newSyncTasks;
};

// --- Get Sync Tasks Dashboard API ---
export const getSyncTasksDashboardApi = async () => {
  try {
    const syncTasks = await getSyncTasksApi();

    const totalTasks = syncTasks.length;

    const statusCount = {
      onProgress: 0,
      success: 0,
      issue: 0,
    };

    for (const task of syncTasks) {
      if (task.status === 'onProgress') statusCount.onProgress++;
      else if (task.status === 'success') statusCount.success++;
      else if (['error', 'warning'].includes(task.status)) statusCount.issue++;
    }

    const recentTasks = syncTasks
      .slice()
      .sort((a, b) =>
        new Date(b.updatedAt ?? b.createdAt ?? 0).getTime() -
        new Date(a.updatedAt ?? a.createdAt ?? 0).getTime()
      )
      .slice(0, 6);

    return {
      totalTasks,
      onProgressTasks: statusCount.onProgress,
      successTasks: statusCount.success,
      issueTasks: statusCount.issue,
      recentTasks,
    };
  } catch (error: any) {
    console.error('Failed to fetch sync tasks dashboard:', error.message);
    return {
      totalTasks: 0,
      onProgressTasks: 0,
      successTasks: 0,
      issueTasks: 0,
      recentTasks: [],
    };
  }
};

//TODO:สร้าง Connection ใหม่ โดยมีขั้นตอน
//TODO:ตรวจสอบข้อมูล table source ที่ selected ต้องมี primarykey, name ของ Source ต้องไม่ซ้ำกับที่ใช้ไปแล้ว เพราะเอาไปตั้ง topic
//1. เก็บ config ของการเชื่อมต่อฐานข้อมูล
//2. สร้าง connection ใหม่ เก็บไปไฟล์ Json config
//3. ส่ง connection ไปที่ให้ Kafka ทํางาน 
// --- Create Sync Task API ---
export const createSyncTaskApi = async (syncTaskData: ISyncTask): Promise<ISyncTaskApi> => {
  const sourceConnectorConfig = await createConnectJson(syncTaskData, 'source');
  const sinkConnectorConfig = await createConnectJson(syncTaskData, 'sink');

  const extendedData: Partial<ISyncTask> = {
    ...syncTaskData,
    sourceConnectorConfig,
    sinkConnectorConfig,
  };

  const syncTask = await createSyncTask(extendedData);

  await createConnector(sourceConnectorConfig);
  await createConnector(sinkConnectorConfig);

  return syncTask;
};

export const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));


//TODO: ต้องเพิ่ม log
// --- Start Task By Id ---
export const startTaskById = async (syncTaskId: string): Promise<boolean> => {
  try {
    const syncTaskData = await getSyncTaskById(syncTaskId);

    if (!syncTaskData) {
      throw new Error(`No sync task found for ID: ${syncTaskId}`);
    }

    const sourceName = syncTaskData.sourceConnectorConfig?.name;
    const sinkName = syncTaskData.sinkConnectorConfig?.name;

    if (!sourceName || !sinkName) throw new Error('Connector name missing');

    // Start both connectors
    await resumeConnector(sourceName);
    await resumeConnector(sinkName);

    // Allow time for them to start
    await delay(1000);

    // Check status for both
    const sourceStatus = await getConnectorStatus(sourceName);
    const sinkStatus = await getConnectorStatus(sinkName);

    const isRunning = (status: any) =>
      status?.connector?.state === 'RUNNING' &&
      status?.tasks?.every((task: any) => task.state === 'RUNNING');

    return isRunning(sourceStatus) && isRunning(sinkStatus);
  } catch (error: any) {
    console.error(`Failed to start connectors for task ${syncTaskId}:`, error.message);
    return false;
  }
};


//TODO: ต้องเพิ่ม log
// --- Stop Task By Id ---
export const stopTaskById = async (syncTaskId: string): Promise<boolean> => {
  try {
    const syncTaskData = await getSyncTaskById(syncTaskId);

    if (!syncTaskData) {
      throw new Error(`No sync task found for ID: ${syncTaskId}`);
    }

    const sourceName = syncTaskData.sourceConnectorConfig?.name;
    const sinkName = syncTaskData.sinkConnectorConfig?.name;

    if (!sourceName || !sinkName) throw new Error('Connector name missing');

    // Stop both connectors
    await pauseConnector(sourceName);
    await pauseConnector(sinkName);

    // Wait for the connectors to stop
    await delay(1000);

    // Check status for both
    const sourceStatus = await getConnectorStatus(sourceName);
    const sinkStatus = await getConnectorStatus(sinkName);

    const isStopped = (status: any) =>
      status?.connector?.state !== 'RUNNING' &&
      status?.tasks?.every((task: any) => task.state !== 'RUNNING');

    return isStopped(sourceStatus) && isStopped(sinkStatus);
  } catch (error: any) {
    console.error(`Failed to stop connectors for task ${syncTaskId}:`, error.message);
    return false;
  }
};

export default {
  createConnectJson,
  createSyncTaskApi,
  getSyncTasksApi,
  startTaskById,
  stopTaskById,
  getSyncTasksDashboardApi
};