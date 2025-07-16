// @core/services/connectors/oracleSinkConnector.ts

import { IDebeziumConnectorConfig } from "@core/models/type.js";
import { IConnectorBuilder, IConnectorBuildData } from "../IConnectorBuilder.js";
import { ConnectorType } from "@core/models/type.js";

export class OracleSinkConnectorBuilder implements IConnectorBuilder {
  name = "oracle";
  type: ConnectorType = "sink";

  build(buildData: IConnectorBuildData): IDebeziumConnectorConfig {
    const { name, pipeline } = buildData;

    const source = pipeline.sourceDbConnection;
    const target = pipeline.targetDbConnection;
    const topicPrefix = source.host.replace(/\./g, "_");
    const database = source.database;
    const schema = source.dbSchema || "dbo";

    const selectedTables = pipeline.sourceTables.filter((t) => t.isSelected);
    const tableTopics = selectedTables.map(
      (table) => `${topicPrefix}.${database}.${schema}.${table.name}`
    );

    return {
      name: name?.sink ?? `sink.${tableTopics.join(",")}.${pipeline._id}`,
      config: {
        "connector.class": "io.confluent.connect.jdbc.JdbcSinkConnector",
        "dialect.name": "OracleDatabaseDialect",
        "tasks.max": "3",
        "max.retries": "10",
        "retry.backoff.ms": "1000",

        "max.poll.records": "750",
        "consumer.fetch.max.bytes": "104857600",
        "batch.size": "500",
        "linger.ms": "80",
        "flush.size": "1500",

        "connection.url": `jdbc:oracle:thin:@//${target.host}:${target.port}/${target.database}`,
        "connection.user": target.username,
        "connection.password": target.password,

        "insert.mode": "upsert",
        "pk.mode": "record_key",
        "pk.fields": "DetailID",

        "auto.create": "false",
        "auto.evolve": "false",

        "topics": tableTopics.join(","),

        "quote.identifiers": "false",

        "transforms": "RenameTopic,unwrap",

        // ✅ unwrap payload
        "transforms.unwrap.type": "io.debezium.transforms.ExtractNewRecordState",
        "transforms.unwrap.drop.tombstones": "false",
        "transforms.unwrap.delete.handling.mode": "rewrite",
        "transforms.unwrap.add.fields": "op,table,ts_ms",
        "transforms.unwrap.add.fields.rename": "OP,TABLE_NAME,TS_MS",

        // ✅ regex topic rename
        "transforms.RenameTopic.type": "org.apache.kafka.connect.transforms.RegexRouter",
        "transforms.RenameTopic.regex": `^${topicPrefix}\\.${database}\\.${schema}\\.(.*)$`,
        "transforms.RenameTopic.replacement": "$1",
      },
    };
  }
}
