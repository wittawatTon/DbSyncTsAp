-- 🔁 1. เข้า PDB ก่อน
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
