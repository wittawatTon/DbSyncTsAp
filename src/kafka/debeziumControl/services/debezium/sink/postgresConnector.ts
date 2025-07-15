import { IDebeziumConnectorConfig } from "@core/models/type.js";
import { ConnectionConfigDocument } from "@core/models/dbConnection.model.js";
import { TableDocument } from "@core/models/tableWithMap.model.js";

export function buildPostgresSinkConnectorConfig(
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

//oracle->postgres
  return {
    name: `sink.${topicPrefix}.${database}.${schema}.${pipelineId}`,
    config: {
      "connector.class": "io.confluent.connect.jdbc.JdbcSinkConnector",
      "tasks.max": "3",
      "connection.url": `jdbc:postgresql://${target.host}:${target.port}/${target.database}`,
      "connection.user": target.username,
      "connection.password": target.password,
      "connection.driver": "org.postgresql.Driver",
      "insert.mode": "upsert",
      "pk.mode": "record_key",
      "auto.create": "true",
      "auto.evolve": "true",
      "max.retries": "10",             
      "retry.backoff.ms": "1000",      

      "max.poll.records": "1500",
      "consumer.fetch.max.bytes": "104857600",
      "batch.size": "1000", 
      "linger.ms": "80",
      "flush.size": "1500",

      //topics: tableTopics.join(","),
      topics: "192_168_1_51.C__TESTCDC.TEST",
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
