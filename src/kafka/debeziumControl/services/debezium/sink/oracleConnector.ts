import { IDebeziumConnectorConfig } from "@core/models/type.js";
import { ConnectionConfigDocument } from "@core/models/dbConnection.model.js";
import { TableDocument } from "@core/models/tableWithMap.model.js";

/* Sink to Oracle */
export function buildOracleSinkConnectorConfig(
  source: ConnectionConfigDocument,
  target: ConnectionConfigDocument,
  tables: TableDocument[],
): IDebeziumConnectorConfig {
  const topicPrefix = source.host.replace(/\./g, "-");
  const database = source.database;
  const schema = source.dbSchema || "dbo";

  const selectedTables = tables.filter(t => t.isSelected);

  const tableTopics = selectedTables.map(
    (table) => `${topicPrefix}.${database}.${schema}.${table.name}`
  );

  return {
    name: `${target.database.replace(/\s+/g, '_').toLowerCase()}_${Date.now()}`,
    config: {
      "connector.class": "io.confluent.connect.jdbc.JdbcSinkConnector",
      "dialect.name": "OracleDatabaseDialect",
      "tasks.max": "1",

      "connection.url": `jdbc:oracle:thin:@//${target.host}:${target.port}/${target.database}`,
      "connection.user": target.username,
      "connection.password": target.password,

      "insert.mode": "upsert",
      "pk.mode": "record_key",
      "pk.fields": "id",

      // ปิด auto create/evolve ถ้าเราสร้าง table เอง (เช่น ปรับชนิด date/decimal)
      "auto.create": "false",
      "auto.evolve": "false",

      "topics": tableTopics.join(","),

      "quote.identifiers": "false",

      "transforms": "RenameTopic,unwrap",
      
      // ✅ unwrap record payload
      "transforms.unwrap.type": "io.debezium.transforms.ExtractNewRecordState",
      "transforms.unwrap.drop.tombstones": "false",
      "transforms.unwrap.delete.handling.mode": "rewrite",
      "transforms.unwrap.add.fields": "op,table,ts_ms",
      "transforms.unwrap.add.fields.rename": "OP,TABLE_NAME,TS_MS",

      // ✅ convert topic from full to table name only
      "transforms.RenameTopic.type": "org.apache.kafka.connect.transforms.RegexRouter",
      "transforms.RenameTopic.regex": `^${topicPrefix}\\.${database}\\.${schema}\\.(.*)$`,
      "transforms.RenameTopic.replacement": "$1"
    },
  };
}


/* คำสั่งสร้าง oracel database table 
DROP TABLE TESTCDC."orders" PURGE;


CREATE TABLE "TESTCDC"."orders" (
  "id" NUMBER(10, 0) PRIMARY KEY,
  "customer_id" NUMBER(10, 0),
  "order_date" DATE,
  "__deleted" CHAR(5),
  "__op" CHAR(1),
  "__table" VARCHAR2(50),
  "__ts_ms" NUMBER(19,0)
);


ALTER TABLE TESTCDC."orders" MODIFY ("id" DEFAULT 0);



SELECT * FROM "TESTCDC"."orders";
*/

/*คำสั่งให้สิทธิ์การใช้งาน
ALTER SESSION SET CONTAINER = XEPDB1;

-- ✅ 2. สร้าง user ปกติ
CREATE USER TESTCDC IDENTIFIED BY test;

-- ✅ 3. ให้สิทธิ์พื้นฐาน
GRANT CONNECT, RESOURCE TO TESTCDC;

-- ✅ 4. ให้สิทธิ์ในการสร้างและแก้ไขตาราง
GRANT CREATE TABLE TO TESTCDC;
GRANT ALTER ANY TABLE TO TESTCDC;

-- ✅ 5. ให้สิทธิ์ในการจัดการข้อมูล
GRANT INSERT ANY TABLE TO TESTCDC;
GRANT UPDATE ANY TABLE TO TESTCDC;
GRANT DELETE ANY TABLE TO TESTCDC;

-- ✅ 6. อนุญาตใช้งาน tablespace
ALTER USER TESTCDC DEFAULT TABLESPACE USERS QUOTA UNLIMITED ON USERS;


GRANT SELECT ANY DICTIONARY TO TESTCDC;
*/