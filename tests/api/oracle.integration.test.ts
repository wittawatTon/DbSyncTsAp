import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { IDbConnection } from '@core/models/dbConnection.model.js';
import { testDatabaseConnection, getTables } from '@api/services/databaseService.js';
import { OracleClient } from '@api/services/database/oracle/OracleClient.js';

// Load environment variables from .env.test
import dotenv from 'dotenv';
dotenv.config({ path: '.env.test' });

const oracleConfig: IDbConnection = {
  dbType: 'oracle',
  host: process.env.ORACLE_TEST_HOST!,
  port: parseInt(process.env.ORACLE_TEST_PORT!, 10),
  username: process.env.ORACLE_TEST_USER!,
  password: process.env.ORACLE_TEST_PASSWORD!,
  database: process.env.ORACLE_TEST_DB!,
  ssl: false,
};

describe('Oracle Integration Tests', () => {
  // Setup: Create test tables before any tests run
  beforeAll(async () => {
    const client = new OracleClient(oracleConfig);
    try {
      await client.connect();
      console.log('Setting up Oracle test tables...');
      // Using an anonymous PL/SQL block to handle "table already exists" errors gracefully
      await client.query(`
        BEGIN
           EXECUTE IMMEDIATE 'CREATE TABLE test_employees (emp_id NUMBER PRIMARY KEY, emp_name VARCHAR2(100))';
        EXCEPTION
           WHEN OTHERS THEN
              IF SQLCODE != -955 THEN RAISE; END IF;
        END;
      `);
      await client.query(`
        BEGIN
           EXECUTE IMMEDIATE 'CREATE TABLE test_products (prod_id NUMBER PRIMARY KEY, prod_desc VARCHAR2(200))';
        EXCEPTION
           WHEN OTHERS THEN
              IF SQLCODE != -955 THEN RAISE; END IF;
        END;
      `);
      console.log('Oracle test tables are ready.');
    } catch (err: any) {
      console.error('Failed to setup Oracle tables:', err.message);
      throw err; // Fail fast if setup fails
    } finally {
      await client.disconnect();
    }
  });

  // Teardown: Drop test tables after all tests have run
  afterAll(async () => {
    const client = new OracleClient(oracleConfig);
    try {
      await client.connect();
      console.log('Tearing down Oracle test tables...');
      await client.query(`
        BEGIN
           EXECUTE IMMEDIATE 'DROP TABLE test_employees';
        EXCEPTION
           WHEN OTHERS THEN
              IF SQLCODE != -942 THEN RAISE; END IF; -- ORA-00942: table or view does not exist
        END;
      `);
      await client.query(`
        BEGIN
           EXECUTE IMMEDIATE 'DROP TABLE test_products';
        EXCEPTION
           WHEN OTHERS THEN
              IF SQLCODE != -942 THEN RAISE; END IF;
        END;
      `);
      console.log('Oracle test tables torn down.');
    } catch (err: any) {
      console.error('Failed to tear down Oracle tables:', err.message);
    } finally {
      await client.disconnect();
    }
  });

  describe('testDatabaseConnection', () => {
    it('should return true for a valid Oracle connection', async () => {
      const isConnected = await testDatabaseConnection(oracleConfig);
      expect(isConnected).toBe(true);
    });

    it('should return false for an invalid Oracle connection', async () => {
      const wrongConfig = { ...oracleConfig, password: 'wrongpassword' };
      const isConnected = await testDatabaseConnection(wrongConfig);
      expect(isConnected).toBe(false);
    });
  });

  describe('getTables', () => {
    it('should get Oracle tables with columns', async () => {
      const tables = await getTables(oracleConfig, true);
      const employeeTable = tables.find(t => t.name === 'TEST_EMPLOYEES');
      expect(employeeTable).toBeDefined();
      expect(employeeTable?.columns.length).toBeGreaterThan(0);
      expect(employeeTable?.columns.some(c => c.name === 'EMP_ID' && c.isPrimaryKey)).toBe(true);
    });
  });
});