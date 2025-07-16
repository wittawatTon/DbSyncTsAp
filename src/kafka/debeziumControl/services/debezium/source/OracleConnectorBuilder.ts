// @core/services/connectors/oracleConnector.ts

import { IDebeziumConnectorConfig } from "@core/models/type.js";
import { IConnectorBuilder, IConnectorBuildData } from "../IConnectorBuilder.js";
import { ConnectorType } from "@core/models/type.js";

export class OracleConnectorBuilder implements IConnectorBuilder {
  name = "oracle";
  type: ConnectorType = "source";

  build(buildData: IConnectorBuildData): IDebeziumConnectorConfig {
    const { name, pipeline, serverId } = buildData;
    const kafkaServer = process.env.KAFKA_CONNECT_URL || "localhost:9092";
    const connection = pipeline.sourceDbConnection;

    const database = connection.database.replace(/\./g, "_");
    const topicPrefix = connection.host.replace(/\./g, "_");
    const schema = connection.username;

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
        "connector.class": "io.debezium.connector.oracle.OracleConnector",
        "tasks.max": "1",
        "database.hostname": connection.host,
        "database.port": connection.port.toString(),
        "database.user": connection.username,
        "database.password": connection.password,
        "database.names": connection.database,
        "database.server.name": database,
        "database.dbname": "XE", // ถ้ามี dynamic PDB name ก็ใช้ `connection.database`
        "database.pdb.name": connection.database,
        "database.connection.adapter": "olr",
        "openlogreplicator.source": "O112A",
        "openlogreplicator.host": "192.168.1.51",
        "openlogreplicator.port": "8088",

        // Optional: ปิด encryption ถ้าไม่ต้องใช้
        "database.encrypt": "false",

        // Oracle-specific: ใช้ schema และ table แบบ fully qualified
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

        "datatype.propagate.source.type": "true",
        "time.precision.mode": "connect",
        "decimal.handling.mode": "double",

        "key.converter.schemas.enable": "true",
        "value.converter.schemas.enable": "true",
      },
    };
  }
}
