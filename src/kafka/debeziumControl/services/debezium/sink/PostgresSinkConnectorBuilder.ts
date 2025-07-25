// @core/services/connectors/postgresSinkConnector.ts

import { IDebeziumConnectorConfig } from "@core/models/type.js";
import { IConnectorBuilder, IConnectorBuildData } from "../IConnectorBuilder.js";
import { ConnectorType } from "@core/models/type.js";
import { ConnectorBuilderBase } from "./ConnectorBuilderBase.js";

export class PostgresSinkConnectorBuilder extends ConnectorBuilderBase {
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
/*
  return {
      name: name?.sink ?? `sink.${topicPrefix}.${database}.${schema}.${pipeline._id}`,
      config: {}    
    };*/


    return {
      name: name?.sink ?? `sink.${topicPrefix}.${database}.${schema}.${pipeline._id}`,
      config: {
        "connector.class": "io.confluent.connect.jdbc.JdbcSinkConnector",
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
        "tasks.max": "4",
        "max.poll.records": "10000",            // ดึงทีละ 1500 records
        "consumer.fetch.max.bytes": "104857600", // 100 MB fetch
        "consumer.fetch.min.bytes": "1048576", // 1 MB fetch
        "batch.size": "8000",                   // ส่ง batch 1000 record ต่อครั้ง
        "linger.ms": "200",                      // รอรวม batch สั้นๆ ก่อนส่ง
        "flush.size": "8000",                   // จำนวน record ที่ flush ไปยัง DB

        "consumer.override.max.poll.records": "10000",

        "key.converter": "io.confluent.connect.avro.AvroConverter",
        "value.converter": "io.confluent.connect.avro.AvroConverter",
        "key.converter.schema.registry.url": "http://schema-registry:8081",
        "value.converter.schema.registry.url": "http://schema-registry:8081",

        "topics": tableTopics.join(","),

        ...this.createSmtConfig(pipeline),

      },
    };
  }
}
