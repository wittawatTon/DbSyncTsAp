-- 2. สร้างตารางตัวอย่าง
CREATE TABLE IF NOT EXISTS accounts (
  user_id     SERIAL PRIMARY KEY,
  username    VARCHAR(50) UNIQUE NOT NULL,
  password    VARCHAR(50) NOT NULL,
  email       VARCHAR(255) UNIQUE NOT NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
  last_login  TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
  product_id SERIAL PRIMARY KEY,
  name       VARCHAR(100) NOT NULL,
  price      NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  in_stock   BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS orders (
  order_id   SERIAL PRIMARY KEY,
  user_id    INT NOT NULL REFERENCES accounts(user_id),
  order_date TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_items (
  order_item_id SERIAL PRIMARY KEY,
  order_id      INT NOT NULL REFERENCES orders(order_id),
  product_id    INT NOT NULL REFERENCES products(product_id),
  quantity      INT NOT NULL CHECK (quantity > 0),
  price_unit    NUMERIC(10,2) NOT NULL CHECK (price_unit >= 0)
);

-- 3. เติมข้อมูลตัวอย่าง
INSERT INTO accounts (username, password, email)
VALUES
  ('alice', 'pass123', 'alice@example.com'),
  ('bob',   'secure!', 'bob@example.com');

INSERT INTO products (name, price)
VALUES
  ('Widget A', 19.99),
  ('Gadget B',  9.99),
  ('Thingamajig C', 4.50);

INSERT INTO orders (user_id)
VALUES (1), (2);

INSERT INTO order_items (order_id, product_id, quantity, price_unit)
VALUES
  (1, 1, 2, 19.99),
  (1, 3, 1,  4.50),
  (2, 2, 5,  9.99);


      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE';



