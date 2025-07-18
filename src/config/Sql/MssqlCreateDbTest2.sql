IF NOT EXISTS (SELECT * FROM sys.server_principals WHERE name = N'cdc_user')
BEGIN
    PRINT 'Creating LOGIN [cdc_user]...';
    CREATE LOGIN [cdc_user] WITH PASSWORD = N'P@ss1234';
END
ELSE
BEGIN
    PRINT 'LOGIN [cdc_user] already exists.';
END
GO

-- ตรวจสอบและสร้างฐานข้อมูล
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'inventory')
BEGIN
    CREATE DATABASE inventory;
END
GO

USE inventory;
GO



IF NOT EXISTS (SELECT * FROM sys.database_principals WHERE name = N'cdc_user')
BEGIN
    PRINT 'Creating USER [cdc_user] in database [inventory]...';
    CREATE USER [cdc_user] FOR LOGIN [cdc_user];
END
ELSE
BEGIN
    PRINT 'USER [cdc_user] already exists in database [inventory].';
END
GO

-- [3] ให้สิทธิ์ user ใช้งานฐานข้อมูล (เลือกหนึ่ง)

-- ✅ ทางเลือกง่ายสุด: ให้ db_owner (สำหรับ Dev/Test)
EXEC sp_addrolemember 'db_owner', 'cdc_user';


-- ตารางที่ 1: categories
CREATE TABLE categories (
    id INT IDENTITY(1,1) PRIMARY KEY,
    name NVARCHAR(100) NOT NULL,
    description NVARCHAR(MAX)
);
GO

INSERT INTO categories (name, description) VALUES
(N'Electronics', N'Electronic devices'),
(N'Books', N'All types of books'),
(N'Furniture', N'Home and office furniture'),
(N'Clothing', N'Men and women clothing'),
(N'Food', N'Perishable and non-perishable food'),
(N'Toys', N'Children toys'),
(N'Sports', N'Sporting goods'),
(N'Beauty', N'Beauty and personal care'),
(N'Automotive', N'Vehicle-related items'),
(N'Garden', N'Gardening tools and accessories');
GO

-- ตารางที่ 2: suppliers
CREATE TABLE suppliers (
    id INT IDENTITY(1,1) PRIMARY KEY,
    name NVARCHAR(100) NOT NULL,
    contact_email NVARCHAR(100)
);
GO

INSERT INTO suppliers (name, contact_email) VALUES
(N'Supplier A', N'a@supplier.com'),
(N'Supplier B', N'b@supplier.com'),
(N'Supplier C', N'c@supplier.com'),
(N'Supplier D', N'd@supplier.com'),
(N'Supplier E', N'e@supplier.com'),
(N'Supplier F', N'f@supplier.com'),
(N'Supplier G', N'g@supplier.com'),
(N'Supplier H', N'h@supplier.com'),
(N'Supplier I', N'i@supplier.com'),
(N'Supplier J', N'j@supplier.com');
GO

-- ตารางที่ 3: products
CREATE TABLE products (
    id INT IDENTITY(1,1) PRIMARY KEY,
    name NVARCHAR(100) NOT NULL,
    price DECIMAL(10,2),
    category_id INT,
    supplier_id INT,
    FOREIGN KEY (category_id) REFERENCES categories(id),
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
);
GO

INSERT INTO products (name, price, category_id, supplier_id) VALUES
(N'Laptop', 999.99, 1, 1),
(N'Book 1', 19.99, 2, 2),
(N'Sofa', 499.00, 3, 3),
(N'T-Shirt', 9.99, 4, 4),
(N'Pizza', 12.50, 5, 5),
(N'Toy Car', 14.95, 6, 6),
(N'Football', 25.00, 7, 7),
(N'Shampoo', 7.89, 8, 8),
(N'Car Tire', 89.99, 9, 9),
(N'Lawn Mower', 150.00, 10, 10);
GO

-- ตารางที่ 4: customers
CREATE TABLE customers (
    id INT IDENTITY(1,1) PRIMARY KEY,
    name NVARCHAR(100),
    email NVARCHAR(100)
);
GO

INSERT INTO customers (name, email) VALUES
(N'Alice', N'alice@example.com'),
(N'Bob', N'bob@example.com'),
(N'Charlie', N'charlie@example.com'),
(N'Diana', N'diana@example.com'),
(N'Eve', N'eve@example.com'),
(N'Frank', N'frank@example.com'),
(N'Grace', N'grace@example.com'),
(N'Heidi', N'heidi@example.com'),
(N'Ivan', N'ivan@example.com'),
(N'Judy', N'judy@example.com');
GO

-- ตารางที่ 5: orders
CREATE TABLE orders (
    id INT IDENTITY(1,1) PRIMARY KEY,
    customer_id INT,
    order_date DATE,
    FOREIGN KEY (customer_id) REFERENCES customers(id)
);
GO

INSERT INTO orders (customer_id, order_date) VALUES
(1, '2024-01-01'),
(2, '2024-01-02'),
(3, '2024-01-03'),
(4, '2024-01-04'),
(5, '2024-01-05'),
(6, '2024-01-06'),
(7, '2024-01-07'),
(8, '2024-01-08'),
(9, '2024-01-09'),
(10, '2024-01-10');
GO

-- ตารางที่ 6: order_items
CREATE TABLE order_items (
    id INT IDENTITY(1,1) PRIMARY KEY,
    order_id INT,
    product_id INT,
    quantity INT,
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
);
GO

INSERT INTO order_items (order_id, product_id, quantity) VALUES
(1, 1, 1),
(2, 2, 2),
(3, 3, 1),
(4, 4, 3),
(5, 5, 2),
(6, 6, 1),
(7, 7, 2),
(8, 8, 1),
(9, 9, 4),
(10, 10, 1);
GO

-- ตารางที่ 7: warehouses
CREATE TABLE warehouses (
    id INT IDENTITY(1,1) PRIMARY KEY,
    name NVARCHAR(100),
    location NVARCHAR(100)
);
GO

INSERT INTO warehouses (name, location) VALUES
(N'WH-A', N'Bangkok'),
(N'WH-B', N'Chiang Mai'),
(N'WH-C', N'Phuket'),
(N'WH-D', N'Khon Kaen'),
(N'WH-E', N'Hat Yai'),
(N'WH-F', N'Rayong'),
(N'WH-G', N'Nakhon Ratchasima'),
(N'WH-H', N'Udon Thani'),
(N'WH-I', N'Surat Thani'),
(N'WH-J', N'Pattaya');
GO

-- ตารางที่ 8: stock_levels
CREATE TABLE stock_levels (
    id INT IDENTITY(1,1) PRIMARY KEY,
    product_id INT,
    warehouse_id INT,
    quantity INT,
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id)
);
GO

INSERT INTO stock_levels (product_id, warehouse_id, quantity) VALUES
(1, 1, 50),
(2, 2, 100),
(3, 3, 20),
(4, 4, 200),
(5, 5, 80),
(6, 6, 90),
(7, 7, 60),
(8, 8, 70),
(9, 9, 30),
(10, 10, 40);
GO

-- ตารางที่ 9: employees
CREATE TABLE employees (
    id INT IDENTITY(1,1) PRIMARY KEY,
    name NVARCHAR(100),
    position NVARCHAR(50),
    warehouse_id INT,
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id)
);
GO

INSERT INTO employees (name, position, warehouse_id) VALUES
(N'Somchai', N'Manager', 1),
(N'Somsri', N'Staff', 2),
(N'Anan', N'Staff', 3),
(N'Jiraporn', N'Supervisor', 4),
(N'Niran', N'Staff', 5),
(N'Kanya', N'Manager', 6),
(N'Chaiwat', N'Driver', 7),
(N'Pornthip', N'Staff', 8),
(N'Sakda', N'Supervisor', 9),
(N'Malee', N'Staff', 10);
GO

-- ตารางที่ 10: audits
CREATE TABLE audits (
    id INT IDENTITY(1,1) PRIMARY KEY,
    employee_id INT,
    audit_date DATE,
    notes NVARCHAR(MAX),
    FOREIGN KEY (employee_id) REFERENCES employees(id)
);
GO

INSERT INTO audits (employee_id, audit_date, notes) VALUES
(1, '2024-03-01', N'Monthly check'),
(2, '2024-03-02', N'Stock adjustment'),
(3, '2024-03-03', N'Random check'),
(4, '2024-03-04', N'Inventory mismatch'),
(5, '2024-03-05', N'Routine audit'),
(6, '2024-03-06', N'Monthly check'),
(7, '2024-03-07', N'System sync'),
(8, '2024-03-08', N'Staff training'),
(9, '2024-03-09', N'New stock arrival'),
(10, '2024-03-10', N'Process improvement');
GO
