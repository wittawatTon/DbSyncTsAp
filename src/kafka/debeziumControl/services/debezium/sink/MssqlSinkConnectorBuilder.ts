import { IDebeziumConnectorConfig } from "@core/models/type.js";
import { IConnectorBuilder, IConnectorBuildData } from "../IConnectorBuilder.js";
import { ConnectorType } from "@core/models/type.js";

export class MssqlSinkConnectorBuilder implements IConnectorBuilder {
  name = "mssql";
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
      name: name?.sink ?? `sink.${topicPrefix}.${database}.${schema}.${pipeline._id}`,
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

        // ✅ Rename topic to just table name
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
}
