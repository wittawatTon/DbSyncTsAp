import { IDebeziumConnectorConfig } from "@core/models/type.js";
import { ConnectionConfigDocument } from "@core/models/dbConnection.model.js";
import { TableDocument } from "@core/models/tableWithMap.model.js";

// ใช้สำหรับ quote Oracle identifier ให้ถูกต้อง เช่น "C##TESTCDC"."TEST"."ID"
//const quote = (name: string) => `"${name.replace(/"/g, '""')}"`;


export function buildOracleConnectorConfig(
  pipelineId: string,
  connection: ConnectionConfigDocument,
  tables: TableDocument[],
  serverId: number
): IDebeziumConnectorConfig {
  const kafkaServer = process.env.KAFKA_CONNECT_URL || "localhost:9092";
  const database = connection.database.replace(/\./g, "_");
  const topicPrefix = connection.host.replace(/\./g, "_");

  // Schema สำหรับ Oracle ให้ใช้ username เป็นค่า default
  const schema = connection.username;

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
    name: `source.${topicPrefix}.${database}.${schema.replace(/\./g, "_")}.${pipelineId}`,
    config: {
      "connector.class": "io.debezium.connector.oracle.OracleConnector",
      "tasks.max": "1",
      "database.hostname": connection.host,
      "database.port": connection.port.toString(),
      "database.user": connection.username,
      "database.password": connection.password,
      "database.names": connection.database,
      "database.server.name": database,
      "database.dbname": "XE",
      "database.pdb.name": connection.database,
      "database.encrypt": "false",

      // ใส่ double quote ให้เหมาะกับ Oracle
      //"schema.include.list": connection.username,
      //"table.include.list": selectedTables.join(","),
      //"column.include.list": selectedColumns.join(","),

      "topic.prefix": topicPrefix,
      "schema.history.internal.kafka.bootstrap.servers": kafkaServer,
      "schema.history.internal.kafka.topic": `schema_history.${database}`,
      "database.history.kafka.bootstrap.servers": kafkaServer,
      "database.history.kafka.topic": `dbhistory.${database}`,

      "database.connection.adapter": "olr",
      "openlogreplicator.source": "O112A",
      "openlogreplicator.host": "192.168.1.51",
      "openlogreplicator.port": "8088",
      "snapshot.mode": "initial",
      "snapshot.fetch.size": 30000,
      "snapshot.mode.parallel": true,
      "snapshot.num.threads": 4,

      "datatype.propagate.source.type": "true",
      "time.precision.mode": "connect",
      "decimal.handling.mode": "double",

      "key.converter.schemas.enable": "true",
      "value.converter.schemas.enable": "true"
    },
  };
}
