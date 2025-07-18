USE inventory;

SELECT s.name AS schema_name, o.name AS object_name, o.type_desc
FROM sys.objects o
JOIN sys.schemas s ON o.schema_id = s.schema_id
WHERE s.name = 'cdc';




EXEC sys.sp_cdc_enable_db;

EXEC sys.sp_cdc_enable_table
        @source_schema = N'dbo',
        @source_name   = N'customers',
        @role_name     = NULL,
        @supports_net_changes = 1;



-- 1. บังคับให้เข้าสู่โหมด SINGLE_USER เพื่อป้องกันการใช้งานจากผู้ใช้อื่น
USE master;
GO
ALTER DATABASE inventory SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
GO

-- 2. ลบฐานข้อมูล
DROP DATABASE inventory;
GO