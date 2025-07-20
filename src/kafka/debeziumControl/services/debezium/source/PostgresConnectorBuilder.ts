import { IDebeziumConnectorConfig } from "@core/models/type.js";
import { IConnectorBuilder, IConnectorBuildData } from "../IConnectorBuilder.js";
import { ConnectorType } from "@core/models/type.js";
import { ConnectorBuilderBase } from "./ConnectorBuilderBase.js";

export class PostgresConnectorBuilder  extends ConnectorBuilderBase{
  name = "postgres";
  type: ConnectorType = "source";

  build(buildData: IConnectorBuildData): IDebeziumConnectorConfig {
    const { name, pipeline, serverId } = buildData;

    const kafkaServer = process.env.KAFKA_CONNECT_URL || "localhost:9092";
    const connection = pipeline.sourceDbConnection;

    const database = connection.database.replace(/\./g, "_").toLowerCase();
    const topicPrefix = connection.host.replace(/\./g, "_");
    const schema = (connection.dbSchema || "public").replace(/\./g, "_");

    const selectedTables = pipeline.sourceTables
      .filter((t) => t.isSelected)
      .map((t) => `${schema}.${t.name}`);

    const selectedColumns = pipeline.sourceTables.flatMap((table) =>
      table.isSelected
        ? table.columns
            .filter((col) => col.isSelected)
            .map((col) => `${schema}.${table.name}.${col.name}`)
        : []
    );

    return {
      name: name?.source,
      config: {
        "connector.class": "io.debezium.connector.postgresql.PostgresConnector",
        "plugin.name": "pgoutput", // Recommended logical decoding plugin
        "tasks.max": "1",

        "database.hostname": connection.host,
        "database.port": connection.port.toString(),
        "database.user": connection.username,
        "database.password": connection.password,
        "database.dbname": connection.database,

        "database.server.name": database,
        "schema.include.list": schema,
        "table.include.list": selectedTables.join(","),
        "column.include.list": selectedColumns.join(","),

        "topic.prefix": topicPrefix,
        "slot.name": `slot_${database}_${pipeline._id}`, // Logical replication slot (must be unique)
        "publication.name": `pub_${database}_${pipeline._id}`, // Optional: custom publication name

        "schema.history.internal.kafka.bootstrap.servers": kafkaServer,
        "schema.history.internal.kafka.topic": `schema_history.${database}`,

        "snapshot.mode": "initial",
        "snapshot.fetch.size": 30000,

        "datatype.propagate.source.type": "true",
        "time.precision.mode": "connect",
        "decimal.handling.mode": "double",

        "key.converter.schemas.enable": "true",
        "value.converter.schemas.enable": "true"
      },
    };
  }
}
