// @core/services/connectors/oracleConnector.ts

import { IDebeziumConnectorConfig } from "@core/models/type.js";
import { IConnectorBuilder, IConnectorBuildData } from "../IConnectorBuilder.js";
import { ConnectorType } from "@core/models/type.js";
import { ConnectorBuilderBase } from "./ConnectorBuilderBase.js";

export class OracleConnectorBuilder  extends ConnectorBuilderBase {
  name = "oracle";
  type: ConnectorType = "source";

  build(buildData: IConnectorBuildData): IDebeziumConnectorConfig {
    const { name, pipeline, serverId } = buildData;
    const kafkaServer = process.env.KAFKA_SERVER || "localhost:9092";
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

    //TOPIC: <topicPrefix>.<schemaName>.<tableName>
    return {
      name: name?.source,
      config: {
        "connector.class": "io.debezium.connector.oracle.OracleConnector",
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

        ...this.getConnectorTableConfig(pipeline, schema), 
        ...this.getConnectorColumnConfig(pipeline, schema),   

        "topic.prefix": topicPrefix,

        "schema.history.internal.kafka.bootstrap.servers": kafkaServer,
        "schema.history.internal.kafka.topic": `schema_history.${topicPrefix}.${database}`,
        "schema.history.internal.recovery.attempts": "3",


        "key.converter": "io.confluent.connect.avro.AvroConverter",
        "value.converter": "io.confluent.connect.avro.AvroConverter",
        "key.converter.schema.registry.url": "http://schema-registry:8081",
        "value.converter.schema.registry.url": "http://schema-registry:8081",
        "value.converter.schemas.enable": "true",
        "key.converter.schemas.enable": "true",

        "tasks.max": "1",
        "topic.creation.enable": "true",
        "topic.partitions": "4",
        
        "topic.creation.default.partitions": "4",
        "topic.creation.default.cleanup.policy": "compact",
        "topic.creation.default.replication.factor": "1",
        "topic.creation.default.compression.type": "lz4",

        // ขอสร้างกลุ่มพิเศษสำหรับ schema history topic
        "topic.creation.groups": "history",
        "topic.creation.history.include": "schema_history\\..*",
        "topic.creation.history.partitions": "1",
        "topic.creation.history.replication.factor": "1",

        // กำหนด group ใหม่สำหรับ topic เฉพาะนี้
        "topic.creation.customTestTopic.include": "192_168_1_51\\.C__TESTCDC\\.TEST",
        "topic.creation.customTestTopic.partitions": "4",
        "topic.creation.customTestTopic.replication.factor": "1",
        "topic.creation.customTestTopic.cleanup.policy": "compact",
        "topic.creation.customTestTopic.compression.type": "lz4",

        "snapshot.mode": "initial",
        "snapshot.max.threads": 4,           // ทำ snapshot พร้อมกัน 4 ตาราง (ถ้าใช้ได้)
        "snapshot.fetch.size": 50000,        // ดึงข้อมูลทีละ 30,000 แถว
        "snapshot.delay.ms": "0",


        "incremental.snapshot.chunk.size": 50000,
        "max.batch.size": 50000,             // ส่งข้อมูลเป็น batch ทีละ 30,000
        "max.queue.size": 300000,            // ขนาด queue สำหรับ batch data
        "poll.interval.ms": 5000,            // ดึงข้อมูลทุก 5 วินาที

        // Kafka Producer tuning
        "producer.override.batch.size": "1000000",   // batch ใหญ่
        "producer.override.linger.ms": "100",         // รอรวบรวมข้อมูลสั้น ๆ ก่อนส่ง
        "producer.override.compression.type": "lz4",  // บีบอัดข้อมูลแบบ lz4
        "producer.override.max.request.size": "3000000",

        "datatype.propagate.source.type": "true",
        "time.precision.mode": "connect",
        "decimal.handling.mode": "double",

      },
    };
  }
}
