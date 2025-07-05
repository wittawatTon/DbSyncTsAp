import { IDebeziumConnectorConfig } from "@core/models/type.js";
import { ConnectionConfigDocument } from "@core/models/dbConnection.model.js";
import { TableDocument } from "@core/models/tableWithMap.model.js";

export function buildMssqlConnectorConfig(
  connection: ConnectionConfigDocument,
  tables: TableDocument[],
  serverId: number
): IDebeziumConnectorConfig {
  const kafkaServer = process.env.KAFKA_CONNECT_URL || "localhost:9092";
  const serverName = connection.database.replace(/\./g, "-").toLowerCase();
  const topicPrefix = connection.host.replace(/\./g, "-");
  const schema = (connection.dbSchema || "dbo").replace(/\./g, "-");

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
    name: `${serverName}_${Date.now()}`,
    config: {
      "connector.class": "io.debezium.connector.sqlserver.SqlServerConnector",
      "database.hostname": connection.host,
      "database.port": connection.port.toString(),
      "database.user": connection.username,
      "database.password": connection.password,
      "database.names": connection.database,
      "database.server.name": serverName,
      "database.encrypt": "false",
      "table.include.list": selectedTables.join(","),
      "column.include.list": selectedColumns.join(","),
      "topic.prefix": topicPrefix,
      "schema.history.internal.kafka.bootstrap.servers": kafkaServer,
      "schema.history.internal.kafka.topic": `schema_history.${serverName}`,
      "database.history.kafka.bootstrap.servers": kafkaServer,
      "database.history.kafka.topic": `dbhistory.${serverName}`,
      "snapshot.mode": "initial",
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

