import { IDebeziumConnectorConfig } from "@core/models/type.js";
import { ConnectionConfigDocument } from "@core/models/dbConnection.model.js";
import { TableDocument } from "@core/models/tableWithMap.model.js";

export function buildMssqlSinkConnectorConfig(
  pipelineId: string,
  source: ConnectionConfigDocument,
  target: ConnectionConfigDocument,
  tables: TableDocument[],
): IDebeziumConnectorConfig {
  const topicPrefix = source.host.replace(/\./g, "_");
  const database = source.database;
  const schema = source.dbSchema || "dbo";

  
  const selectedTables = tables.filter(t => t.isSelected);

  const tableTopics = selectedTables.map(
    (table) => `${topicPrefix}.${database}.${schema}.${table.name}`
  );
  return {
    name: `sink.${topicPrefix}.${database}.${schema}.${pipelineId}`,
    config: {
      "connector.class": "io.confluent.connect.jdbc.JdbcSinkConnector",
      "tasks.max": "1",
      "connection.url": `jdbc:sqlserver://${target.host}:${target.port};databaseName=${target.database}`,
      "connection.user": target.username,
      "connection.password": target.password,
      "connection.driver": "com.microsoft.sqlserver.jdbc.SQLServerDriver",
      "insert.mode": "upsert",
      "pk.mode": "record_key",
      "auto.create": "true",
      "auto.evolve": "true",
      topics: tableTopics.join(","),
      transforms: "RenameTopic,unwrap",
      "transforms.RenameTopic.type": "org.apache.kafka.connect.transforms.RegexRouter",
      "transforms.RenameTopic.regex": "([a-zA-Z0-9_]+)\\.([a-zA-Z0-9_]+)\\.(.*)",
      "transforms.RenameTopic.replacement": "$3",
      "transforms.unwrap.type": "io.debezium.transforms.ExtractNewRecordState",
      "transforms.unwrap.drop.tombstones": "false",
      "transforms.unwrap.delete.handling.mode": "rewrite",
      "transforms.unwrap.add.fields": "op,table",
    },
  };
}
