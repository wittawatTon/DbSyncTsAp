USE ReplicationLoadTest;
CREATE OR ALTER PROCEDURE dbo.CreateReplicationLoadTest
    @RecordCount INT = 250000  
AS
BEGIN
    SET NOCOUNT ON;
    

    -- Drop tables if they exist (for idempotency)
    DROP TABLE IF EXISTS dbo.SalesDetails;
    DROP TABLE IF EXISTS dbo.SalesHeaders;

    -- Create SalesHeaders table
    CREATE TABLE dbo.SalesHeaders (
        OrderID INT IDENTITY(1,1) PRIMARY KEY,
        CustomerID INT NOT NULL,
        OrderDate DATETIME NOT NULL DEFAULT GETDATE(),
        TotalAmount DECIMAL(10,2) NOT NULL
    );

    -- Create SalesDetails table
    CREATE TABLE dbo.SalesDetails (
        DetailID BIGINT IDENTITY(1,1) PRIMARY KEY,
        OrderID INT NOT NULL FOREIGN KEY REFERENCES SalesHeaders(OrderID),
        ProductID INT NOT NULL,
        Quantity INT NOT NULL,
        Price DECIMAL(10,2) NOT NULL
    );

    -- Populate SalesHeaders using efficient batch method
    PRINT 'Inserting ' + CAST(@RecordCount AS VARCHAR) + ' records into SalesHeaders...';
    
    INSERT INTO dbo.SalesHeaders (CustomerID, OrderDate, TotalAmount)
    SELECT 
        ABS(CHECKSUM(NEWID())) % 5000 + 1 AS CustomerID,  -- Random customer 1-5000
        DATEADD(DAY, -ABS(CHECKSUM(NEWID())) % 365, GETDATE()) AS OrderDate,  -- Random date in last year
        ABS(CHECKSUM(NEWID())) % 9900 + 100 AS TotalAmount  -- Random amount $100-$10,000
    FROM 
        sys.all_columns c1
    CROSS JOIN 
        sys.all_columns c2  -- Cross join for large row generation
    ORDER BY 
        (SELECT NULL) OFFSET 0 ROWS FETCH FIRST @RecordCount ROWS ONLY;

    -- Populate SalesDetails (4 details per header)
    PRINT 'Inserting ' + CAST(@RecordCount * 4 AS VARCHAR) + ' records into SalesDetails...';
    
    INSERT INTO dbo.SalesDetails (OrderID, ProductID, Quantity, Price)
    SELECT 
        h.OrderID,
        ABS(CHECKSUM(NEWID())) % 1000 + 1 AS ProductID,  -- Random product 1-1000
        ABS(CHECKSUM(NEWID())) % 10 + 1 AS Quantity,      -- Random quantity 1-10
        ABS(CHECKSUM(NEWID())) % 190 + 10 AS Price        -- Random price $10-$200
    FROM 
        dbo.SalesHeaders h
    CROSS JOIN 
        (VALUES (1),(2),(3),(4)) AS Details(Line);  -- Generate 4 lines per order

    PRINT 'Replication test database setup complete.';
    PRINT 'Tables:';
    PRINT '  SalesHeaders: ' + CAST(@RecordCount AS VARCHAR) + ' records';
    PRINT '  SalesDetails: ' + CAST(@RecordCount * 4 AS VARCHAR) + ' records';
END
GO