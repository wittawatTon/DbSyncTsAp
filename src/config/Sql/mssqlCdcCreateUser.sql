-- สร้าง Login บนระดับเซิร์ฟเวอร์
USE master;
GO
CREATE LOGIN [cdc] WITH PASSWORD = 'P@ss1234';
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



ALTER AUTHORIZATION ON SCHEMA::cdc  TO dbo;
DROP USER IF EXISTS [cdc];

SELECT name FROM sys.schemas
WHERE principal_id = USER_ID('cdc');

DROP LOGIN [cdc];