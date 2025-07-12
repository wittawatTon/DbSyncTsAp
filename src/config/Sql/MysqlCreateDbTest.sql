
-- สร้างฐานข้อมูล
CREATE DATABASE IF NOT EXISTS inventory_db;
USE inventory_db;

-- ตารางที่ 1: categories
CREATE TABLE categories (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    description TEXT
);

INSERT INTO categories (name, description) VALUES
('Electronics', 'Electronic devices'),
('Books', 'All types of books'),
('Furniture', 'Home and office furniture'),
('Clothing', 'Men and women clothing'),
('Food', 'Perishable and non-perishable food'),
('Toys', 'Children toys'),
('Sports', 'Sporting goods'),
('Beauty', 'Beauty and personal care'),
('Automotive', 'Vehicle-related items'),
('Garden', 'Gardening tools and accessories');

-- ตารางที่ 2: suppliers
CREATE TABLE suppliers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    contact_email VARCHAR(100)
);

INSERT INTO suppliers (name, contact_email) VALUES
('Supplier A', 'a@supplier.com'),
('Supplier B', 'b@supplier.com'),
('Supplier C', 'c@supplier.com'),
('Supplier D', 'd@supplier.com'),
('Supplier E', 'e@supplier.com'),
('Supplier F', 'f@supplier.com'),
('Supplier G', 'g@supplier.com'),
('Supplier H', 'h@supplier.com'),
('Supplier I', 'i@supplier.com'),
('Supplier J', 'j@supplier.com');

-- ตารางที่ 3: products
CREATE TABLE products (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    price DECIMAL(10,2),
    category_id INT,
    supplier_id INT,
    FOREIGN KEY (category_id) REFERENCES categories(id),
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
);

INSERT INTO products (name, price, category_id, supplier_id) VALUES
('Laptop', 999.99, 1, 1),
('Book 1', 19.99, 2, 2),
('Sofa', 499.00, 3, 3),
('T-Shirt', 9.99, 4, 4),
('Pizza', 12.50, 5, 5),
('Toy Car', 14.95, 6, 6),
('Football', 25.00, 7, 7),
('Shampoo', 7.89, 8, 8),
('Car Tire', 89.99, 9, 9),
('Lawn Mower', 150.00, 10, 10);

-- ตารางที่ 4: customers
CREATE TABLE customers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100),
    email VARCHAR(100)
);

INSERT INTO customers (name, email) VALUES
('Alice', 'alice@example.com'),
('Bob', 'bob@example.com'),
('Charlie', 'charlie@example.com'),
('Diana', 'diana@example.com'),
('Eve', 'eve@example.com'),
('Frank', 'frank@example.com'),
('Grace', 'grace@example.com'),
('Heidi', 'heidi@example.com'),
('Ivan', 'ivan@example.com'),
('Judy', 'judy@example.com');

-- ตารางที่ 5: orders
CREATE TABLE orders (
    id INT PRIMARY KEY AUTO_INCREMENT,
    customer_id INT,
    order_date DATE,
    FOREIGN KEY (customer_id) REFERENCES customers(id)
);

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

-- ตารางที่ 6: order_items
CREATE TABLE order_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    order_id INT,
    product_id INT,
    quantity INT,
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
);

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

-- ตารางที่ 7: warehouses
CREATE TABLE warehouses (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100),
    location VARCHAR(100)
);

INSERT INTO warehouses (name, location) VALUES
('WH-A', 'Bangkok'),
('WH-B', 'Chiang Mai'),
('WH-C', 'Phuket'),
('WH-D', 'Khon Kaen'),
('WH-E', 'Hat Yai'),
('WH-F', 'Rayong'),
('WH-G', 'Nakhon Ratchasima'),
('WH-H', 'Udon Thani'),
('WH-I', 'Surat Thani'),
('WH-J', 'Pattaya');

-- ตารางที่ 8: stock_levels
CREATE TABLE stock_levels (
    id INT PRIMARY KEY AUTO_INCREMENT,
    product_id INT,
    warehouse_id INT,
    quantity INT,
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id)
);

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

-- ตารางที่ 9: employees
CREATE TABLE employees (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100),
    position VARCHAR(50),
    warehouse_id INT,
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id)
);

INSERT INTO employees (name, position, warehouse_id) VALUES
('Somchai', 'Manager', 1),
('Somsri', 'Staff', 2),
('Anan', 'Staff', 3),
('Jiraporn', 'Supervisor', 4),
('Niran', 'Staff', 5),
('Kanya', 'Manager', 6),
('Chaiwat', 'Driver', 7),
('Pornthip', 'Staff', 8),
('Sakda', 'Supervisor', 9),
('Malee', 'Staff', 10);

-- ตารางที่ 10: audits
CREATE TABLE audits (
    id INT PRIMARY KEY AUTO_INCREMENT,
    employee_id INT,
    audit_date DATE,
    notes TEXT,
    FOREIGN KEY (employee_id) REFERENCES employees(id)
);

INSERT INTO audits (employee_id, audit_date, notes) VALUES
(1, '2024-03-01', 'Monthly check'),
(2, '2024-03-02', 'Stock adjustment'),
(3, '2024-03-03', 'Random check'),
(4, '2024-03-04', 'Inventory mismatch'),
(5, '2024-03-05', 'Routine audit'),
(6, '2024-03-06', 'Monthly check'),
(7, '2024-03-07', 'System sync'),
(8, '2024-03-08', 'Staff training'),
(9, '2024-03-09', 'New stock arrival'),
(10, '2024-03-10', 'Process improvement');
