import { IDebeziumConnectorConfig } from "@core/models/type.js";
import { ConnectionConfigDocument } from "@core/models/dbConnection.model.js";
import { TableDocument } from "@core/models/tableWithMap.model.js";

export function buildMssqlConnectorConfig(
  pipelineId: string,
  connection: ConnectionConfigDocument,
  tables: TableDocument[],
  serverId: number
): IDebeziumConnectorConfig {
  const kafkaServer = process.env.KAFKA_CONNECT_URL || "localhost:9092";
  const database = connection.database.replace(/\./g, "_").toLowerCase();
  const topicPrefix = connection.host.replace(/\./g, "_");
  const schema = (connection.dbSchema || "dbo").replace(/\./g, "_");

  const selectedTables = tables
    .filter((t) => t.isSelected)
    .map((t) => `${schema}.${t.name}`);

  const selectedColumns = tables.flatMap((table) =>
    table.isSelected
      ? table.columns
          .filter((col) => col.isSelected)
          .map((col) => `${schema}.${table.name}.${col.name}`)
      : []
  );
  //Debezium จะสร้าง topic ตามรูปแบบ:<topic.prefix>.<database>.<schema>_<table>

  return {
    name: `source.${topicPrefix}.${database}.${schema}.${pipelineId}`,
    config: {
      "connector.class": "io.debezium.connector.sqlserver.SqlServerConnector",
      "database.hostname": connection.host,
      "database.port": connection.port.toString(),
      "database.user": connection.username,
      "database.password": connection.password,
      "database.names": connection.database,
      "database.server.name": database,
      "database.encrypt": "false",
      "table.include.list": selectedTables.join(","),
      "column.include.list": selectedColumns.join(","),
      "topic.prefix": topicPrefix,
      "schema.history.internal.kafka.bootstrap.servers": kafkaServer,
      "schema.history.internal.kafka.topic": `schema_history.${database}`,
      "database.history.kafka.bootstrap.servers": kafkaServer,
      "database.history.kafka.topic": `dbhistory.${database}`,
      "snapshot.mode": "initial",
      "snapshot.fetch.size": 30000,
      "snapshot.mode.parallel": true,
      "snapshot.num.threads": 4,
      // Improve downstream compatibility
      "datatype.propagate.source.type": "true",
      "time.precision.mode": "connect", // preserve logical types like Date/Timestamp
      "decimal.handling.mode": "double", // safer for most cases unless precision is required

      // Preserve schema (required if using ExtractNewRecordState with schemas)
      "key.converter.schemas.enable": "true",
      "value.converter.schemas.enable": "true"

    },
  };
}

