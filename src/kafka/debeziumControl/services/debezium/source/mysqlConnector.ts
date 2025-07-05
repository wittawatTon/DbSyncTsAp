import { IDebeziumConnectorConfig } from "@core/models/type.js";
import { ConnectionConfigDocument } from "@core/models/dbConnection.model.js";
import { TableDocument } from "@core/models/tableWithMap.model.js";

export function buildMysqlConnectorConfig(
  connection: ConnectionConfigDocument,
  tables: TableDocument[],
  serverId: number
): IDebeziumConnectorConfig {
  const database = connection.database;
  const kafkaServer = process.env.KAFKA_CONNECT_URL || "localhost:9092";
  const serverName = database.replace(/\s+/g, "_").toLowerCase();
  const topicPrefix = connection.host.replace(/\./g, "_");

  const selectedTables = tables
    .filter((t) => t.isSelected)
    .map((t) => `${database}.${t.name}`);

  const selectedColumns = tables.flatMap((table) =>
    table.isSelected
      ? table.columns
          .filter((col) => col.isSelected)
          .map((col) => `${database}.${table.name}.${col.name}`)
      : []
  );

  return {
    name: `${serverName}_${Date.now()}`,
    config: {
      "connector.class": "io.debezium.connector.mysql.MySqlConnector",
      "database.hostname": connection.host,
      "database.port": connection.port.toString(),
      "database.user": connection.username,
      "database.password": connection.password,
      "database.server.id": serverId.toString(),
      "database.server.name": serverName,
      "database.include.list": database,
      "table.include.list": selectedTables.join(","),
      "column.include.list": selectedColumns.join(","),
      "topic.prefix": topicPrefix,
      "database.history.kafka.bootstrap.servers": kafkaServer,
      "database.history.kafka.topic": `dbhistory.${serverName}`,
      "schema.history.internal.kafka.bootstrap.servers": kafkaServer,
      "schema.history.internal.kafka.topic": `schema_history.${serverName}`,
      "snapshot.mode": "initial",
      "snapshot.locking.mode": "extended",
    },
  };
}
