ALTER SESSION SET CONTAINER = XEPDB1;

CREATE OR REPLACE PROCEDURE CREATE_TEST_TABLE(p_rows IN NUMBER) AS
  v_fill1 VARCHAR2(50);
  v_fill2 VARCHAR2(50);
  v_fill3 VARCHAR2(50);
  v_fill4 VARCHAR2(50);
BEGIN
  -- Drop table if exists
  BEGIN
    FOR r IN (
      SELECT s.sid, s.serial#
      FROM v$session s
      JOIN v$locked_object l ON s.sid = l.session_id
      JOIN dba_objects o ON l.object_id = o.object_id
      WHERE o.object_name = 'TEST'
        AND o.owner = 'C##TESTCDC'
    ) LOOP
      EXECUTE IMMEDIATE 'ALTER SYSTEM KILL SESSION ''' || r.sid || ',' || r.serial# || ''' IMMEDIATE';
    END LOOP;

    EXECUTE IMMEDIATE 'DROP TABLE "C##TESTCDC"."TEST" CASCADE CONSTRAINTS';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLCODE != -942 THEN
        RAISE;
      END IF;
  END;

  -- Create new table
  EXECUTE IMMEDIATE '
    CREATE TABLE "C##TESTCDC"."TEST" (
      "ID" NUMBER(10, 0) PRIMARY KEY,
      "CUS_ID" NUMBER(10, 0),
      "ORDER_DATE" DATE,
      "FILLER1" VARCHAR2(50),
      "FILLER2" VARCHAR2(50),
      "FILLER3" VARCHAR2(50),
      "FILLER4" VARCHAR2(50)
    )
  ';

  -- Insert data
  FOR i IN 1..p_rows LOOP
    -- Randomize 4 filler values once per iteration
    --v_fill1 := DBMS_RANDOM.STRING('U', 50);
    --v_fill2 := DBMS_RANDOM.STRING('A', 50);
    --v_fill3 := DBMS_RANDOM.STRING('X', 50);
    --v_fill4 := DBMS_RANDOM.STRING('L', 50);
	v_fill1 := SUBSTR('ABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKLMNOPQRSTUVWXZABCD', 1, 50);

	  
    INSERT INTO "C##TESTCDC"."TEST" (
      ID, CUS_ID, ORDER_DATE,
      FILLER1, FILLER2, FILLER3, FILLER4
    ) VALUES (
      i,
      1000 + i,
      SYSDATE - DBMS_RANDOM.VALUE(1, 365),
      v_fill1, v_fill1, v_fill1, v_fill1
    );

    IF MOD(i, 1000) = 0 THEN
      COMMIT;
    END IF;
  END LOOP;

  COMMIT;
END;


BEGIN
  CREATE_TEST_TABLE(10000000); 
END;

SELECT count(*) FROM TEST t ;

--SELECT * FROM USER_ERRORS WHERE NAME = 'CREATE_TEST_TABLE';


--SELECT * FROM C##TESTCDC.TEST;

--SELECT OWNER, TABLE_NAME FROM ALL_TABLES 
--WHERE TABLE_NAME = 'TEST' AND OWNER LIKE '%TESTCDC%';

