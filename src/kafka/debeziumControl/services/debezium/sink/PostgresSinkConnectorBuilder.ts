// @core/services/connectors/postgresSinkConnector.ts

import { IDebeziumConnectorConfig } from "@core/models/type.js";
import { IConnectorBuilder, IConnectorBuildData } from "../IConnectorBuilder.js";
import { ConnectorType } from "@core/models/type.js";

export class PostgresSinkConnectorBuilder implements IConnectorBuilder {
  name = "postgres";
  type: ConnectorType = "sink";

  build(buildData: IConnectorBuildData): IDebeziumConnectorConfig {
    const { name, pipeline } = buildData;

    const source = pipeline.sourceDbConnection;
    const target = pipeline.targetDbConnection;
    const topicPrefix = source.host.replace(/\./g, "_");
    const database = source.database;
    const schema = source.dbSchema || "dbo";

    const selectedTables = pipeline.sourceTables.filter((t) => t.isSelected);

  const tableTopics = selectedTables.map((table) => {
    if (source.dbType == "oracle") {
      const schema  = (source.username).replace(/[.#]/g, "_");

      // Oracle: topic = <topicPrefix>.<SCHEMA>.<TABLE>
      return `${topicPrefix}.${schema}.${table.name}`;
    } else {
      // JDBC: topic = <topicPrefix>.<DB>.<SCHEMA>.<TABLE>
      return `${topicPrefix}.${database}.${schema}.${table.name}`;
    }
  });

    return {
      name: name?.sink ?? `sink.${topicPrefix}.${database}.${schema}.${pipeline._id}`,
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
        "max.retries": "5",
        "retry.backoff.ms": "1000",

        // เพิ่มประสิทธิภาพ consumer & batch
        "max.poll.records": "45000",            // ดึงทีละ 1500 records
        "consumer.fetch.max.bytes": "104857600", // 100 MB fetch
        "batch.size": "30000",                   // ส่ง batch 1000 record ต่อครั้ง
        "linger.ms": "80",                      // รอรวม batch สั้นๆ ก่อนส่ง
        "flush.size": "30000",                   // จำนวน record ที่ flush ไปยัง DB

        "consumer.override.max.poll.records": "30000",



        "topics": tableTopics.join(","),

        "transforms": "RenameTopic,unwrap",

        // ✅ Rename topic to just table name
        "transforms.RenameTopic.type": "org.apache.kafka.connect.transforms.RegexRouter",
        "transforms.RenameTopic.regex": "([a-zA-Z0-9_]+)\\.([a-zA-Z0-9_]+)\\.(.*)",
        "transforms.RenameTopic.replacement": "$3",

        // ✅ Unwrap Debezium payload
        "transforms.unwrap.type": "io.debezium.transforms.ExtractNewRecordState",
        "transforms.unwrap.drop.tombstones": "false",
        "transforms.unwrap.delete.handling.mode": "rewrite",
        "transforms.unwrap.add.fields": "op,table",


      },
    };
  }
}
