import { IDbConnection } from '@core/models/dbConnection.model.js';
import { DatabaseFactory } from './database/DatabaseFactory.js';
import { IntrospectorFactory } from './database/IntrospectorFactory.js';
import { ITable } from '@core/models/table.model.js';
import { PipelineService } from '@core/services/pipeline.service.js';



export class DatabaseService {
  /**
   * ทดสอบการเชื่อมต่อกับฐานข้อมูล
   */
  async testDatabaseConnection(config: IDbConnection): Promise<boolean> {
    const client = DatabaseFactory.create(config);
    try {
      await client.connect();
      const pool = client.getPool();
      const introspector = IntrospectorFactory.create(config.dbType, pool);
      return await introspector.testConnect();
    } catch (err: any) {
      console.error(`[databaseService] testDatabaseConnection failed:`, err.message);
      return false;
    } finally {
      await client.disconnect();
    }
  }

  /**
   * ดึงรายชื่อ tables และ columns ทั้งหมด
   */
  async getTables(config: IDbConnection, withColumn: boolean = true): Promise<ITable[]> {
    const client = DatabaseFactory.create(config);
    try {
      await client.connect();
      const pool = client.getPool();
      const introspector = IntrospectorFactory.create(config.dbType, pool);
      return await introspector.getTablesAndCols(withColumn);
    } catch (err: any) {
      console.error('[databaseService] getTablesAndColumns failed:', err.message);
      throw err;
    } finally {
      await client.disconnect();
    }
  }

  /**
   * สร้างตารางบนฐานข้อมูลปลายทาง หากยังไม่มีตารางนั้นอยู่
   */
  async createTableOnTarget(
    config: IDbConnection,
    tableName: string,
    sqlCmd: string
  ): Promise<boolean> {
    const client = DatabaseFactory.create(config);
    try {
      await client.connect();
      const pool = client.getPool();
      const introspector = IntrospectorFactory.create(config.dbType, pool);

      // ตรวจสอบว่าตารางมีอยู่หรือยัง
      const tables = await introspector.getTablesAndCols(false);
      const exists = tables.some(t => t.name === tableName);
      if (exists) {
        throw new Error(`Table "${tableName}" already exists.`);
      }

      // สั่งสร้างตารางด้วย SQL command ที่ส่งมา
      await introspector.createTableOnTarget(config, tableName, sqlCmd);

      return true;
    } catch (err: any) {
      console.error(`[databaseService] createTableOnTarget failed:`, err.message);
      throw err;
    } finally {
      await client.disconnect();
    }
  }

async dataDiffCountRow(pipelineId: string): Promise<Record<string, any>> {
  const result: Record<string, any> = {};
  const pipelineService = new PipelineService();

  const pipeline = await pipelineService.findByIdWithPopulate(pipelineId);
  if (!pipeline) throw new Error(`❌ Pipeline not found: ${pipelineId}`);

  const sourceConfig: IDbConnection = pipeline.sourceDbConnection;
  const targetConfig: IDbConnection = pipeline.targetDbConnection;
  const sourceTables = pipeline.sourceTables;
  const targetTables = pipeline.targetTables;

  const sourceClient = DatabaseFactory.create(sourceConfig);
  const targetClient = DatabaseFactory.create(targetConfig);

  try {
    await sourceClient.connect();
    await targetClient.connect();

    const sourcePool = sourceClient.getPool();
    const targetPool = targetClient.getPool();

    const sourceIntrospector = IntrospectorFactory.create(sourceConfig.dbType, sourcePool);
    const targetIntrospector = IntrospectorFactory.create(targetConfig.dbType, targetPool);

    for (const sourceTable of sourceTables) {
      const tgtTable = targetTables.find(t => t.sourceTableName === sourceTable.name);
      if (!tgtTable) {
        result[sourceTable.name] = { error: "❌ Target table not found" };
        continue;
      }

      const [sourceCount, targetCount] = await Promise.all([
        sourceIntrospector.countRows(sourceTable.name),
        targetIntrospector.countRows(tgtTable.name),
      ]);

      result[sourceTable.name] = {
        targetTable: tgtTable.name,
        sourceCount,
        targetCount,
        diff: sourceCount - targetCount,
      };
    }

    return result;
  } catch (err: any) {
    console.error(`❌ dataDiffcountRow error:`, err.message);
    throw err;
  } finally {
    await sourceClient.disconnect();
    await targetClient.disconnect();
  }
}

}
