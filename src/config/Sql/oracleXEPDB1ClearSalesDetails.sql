BEGIN
   EXECUTE IMMEDIATE 'DROP TABLE TESTCDC."SalesDetails" CASCADE CONSTRAINTS';
EXCEPTION
   WHEN OTHERS THEN
      IF SQLCODE != -942 THEN  -- -942 = ORA-00942: table or view does not exist
         RAISE;
      END IF;
END;


ALTER SESSION SET CONTAINER = XEPDB1;
CREATE TABLE TESTCDC."SalesDetails" (
	"DetailID" NUMBER PRIMARY KEY,
	"OrderID" NUMBER,
	"ProductID" NUMBER,
	"Quantity" NUMBER,
	"Price" NUMBER,
	"__deleted" CHAR(5),
	"__op" CHAR(1),
	"__table" VARCHAR2(50),
	"__ts_ms" NUMBER(19,0)
);

ALTER TABLE TESTCDC."SalesDetails" MODIFY ("DetailID" DEFAULT 0);

SELECT * FROM TESTCDC."SalesDetails" WHERE "OrderID" = 250000;

SELECT count(*) FROM TESTCDC."SalesDetails";