import { IDebeziumConnectorConfig } from "@core/models/type.js";
import { ConnectionConfigDocument } from "@core/models/dbConnection.model.js";
import { TableDocument } from "@core/models/tableWithMap.model.js";

export function buildMysqlConnectorConfig(
  connection: ConnectionConfigDocument,
  tables: TableDocument[],
  serverId: number
): IDebeziumConnectorConfig {
  const database = connection.database;
  const kafkaServer = process.env.KAFKA_CONNECT_URL || "localhost:9092";
  const serverName = database.replace(/\s+/g, "_").toLowerCase();
  const topicPrefix = connection.host.replace(/\./g, "_");

  const selectedTables = tables
    .filter((t) => t.isSelected)
    .map((t) => `${database}.${t.name}`);

  const selectedColumns = tables.flatMap((table) =>
    table.isSelected
      ? table.columns
          .filter((col) => col.isSelected)
          .map((col) => `${database}.${table.name}.${col.name}`)
      : []
  );

  return {
    name: `${serverName}_${Date.now()}`,
    config: {
      "connector.class": "io.debezium.connector.mysql.MySqlConnector",
      "database.hostname": connection.host,
      "database.port": connection.port.toString(),
      "database.user": connection.username,
      "database.password": connection.password,
      "database.server.id": serverId.toString(),
      "database.server.name": serverName,
      "database.include.list": database,
      "table.include.list": selectedTables.join(","),
      "column.include.list": selectedColumns.join(","),
      "topic.prefix": topicPrefix,
      "database.history.kafka.bootstrap.servers": kafkaServer,
      "database.history.kafka.topic": `dbhistory.${serverName}`,
      "schema.history.internal.kafka.bootstrap.servers": kafkaServer,
      "schema.history.internal.kafka.topic": `schema_history.${serverName}`,
      "snapshot.mode": "initial",
      "snapshot.locking.mode": "extended",
    },
  };
}

/*-- สร้าง Login บนระดับเซิร์ฟเวอร์
USE master;
GO
CREATE LOGIN [cdc] WITH PASSWORD = 'P@ss1234';
GO

ALTER SERVER ROLE sysadmin ADD MEMBER [cdc];
GO



-- สลับไปยังฐานข้อมูลที่ต้องการเปิด CDC
USE inventory;
GO


-- สร้าง User ในฐานข้อมูลนี้จาก Login
CREATE USER [cdc] FOR LOGIN [cdc];
GO

-- เพิ่ม user นี้เข้าสู่ role db_owner
ALTER ROLE db_owner ADD MEMBER [cdc];
GO


IF EXISTS (SELECT 1 FROM sys.databases WHERE name = 'inventory' AND is_cdc_enabled = 0)
EXEC sys.sp_cdc_enable_db;

-- Drop inventory
USE master;
ALTER DATABASE inventory SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
DROP DATABASE inventory;


-- ถ้า schema มีอยู่ (อาจต้องลบ object ภายในก่อน)
DROP SCHEMA cdc;

-- ถ้า user มีอยู่
DROP USER cdc;

ALTER AUTHORIZATION ON SCHEMA::cdc  TO dbo;
DROP USER IF EXISTS [cdc];

SELECT name FROM sys.schemas
WHERE principal_id = USER_ID('cdc');

DROP LOGIN [cdc];
*/
