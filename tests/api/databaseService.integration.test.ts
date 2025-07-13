import { IDbConnection } from '@core/models/dbConnection.model.js';
import { testDatabaseConnection, getTables } from '@api/services/databaseService.js';
import { OracleClient } from '@api/services/database/oracle/OracleClient.js';

// Load environment variables from .env.test
import dotenv from 'dotenv';
dotenv.config({ path: '.env.test' });

const postgresConfig: IDbConnection = {
  dbType: 'postgres',
  host: process.env.PG_TEST_HOST!,
  port: parseInt(process.env.PG_TEST_PORT!, 10),
  username: process.env.PG_TEST_USER!,
  password: process.env.PG_TEST_PASSWORD!,
  database: process.env.PG_TEST_DB!,
  ssl: false,
};

const oracleConfig: IDbConnection = {
  dbType: 'oracle',
  host: process.env.ORACLE_TEST_HOST!,
  port: parseInt(process.env.ORACLE_TEST_PORT!, 10),
  username: process.env.ORACLE_TEST_USER!,
  password: process.env.ORACLE_TEST_PASSWORD!,
  database: process.env.ORACLE_TEST_DB!,
  ssl: false,
};

describe('databaseService Integration Tests', () => {

  // Setup Oracle tables before tests run
  beforeAll(async () => {
    const oracleClient = new OracleClient(oracleConfig);
    try {
      await oracleClient.connect();
      console.log('Setting up Oracle test tables...');
      // Using an anonymous PL/SQL block to handle "table already exists" errors gracefully
      await oracleClient.query(`
        BEGIN
           EXECUTE IMMEDIATE 'CREATE TABLE test_employees (emp_id NUMBER PRIMARY KEY, emp_name VARCHAR2(100))';
        EXCEPTION
           WHEN OTHERS THEN
              IF SQLCODE != -955 THEN
                 RAISE;
              END IF;
        END;
      `);
      await oracleClient.query(`
        BEGIN
           EXECUTE IMMEDIATE 'CREATE TABLE test_products (prod_id NUMBER PRIMARY KEY, prod_desc VARCHAR2(200))';
        EXCEPTION
           WHEN OTHERS THEN
              IF SQLCODE != -955 THEN
                 RAISE;
              END IF;
        END;
      `);
      console.log('Oracle test tables are ready.');
    } catch (err) {
      console.error('Failed to setup Oracle tables:', err);
      // Allow tests to continue, they will likely fail which is informative
    } finally {
      await oracleClient.disconnect();
    }
  });

  describe('testDatabaseConnection', () => {
    it('should return true for a valid PostgreSQL connection', async () => {
      const isConnected = await testDatabaseConnection(postgresConfig);
      expect(isConnected).toBe(true);
    });

    it('should return true for a valid Oracle connection', async () => {
      const isConnected = await testDatabaseConnection(oracleConfig);
      expect(isConnected).toBe(true);
    });

    it('should return false for an invalid PostgreSQL connection', async () => {
      const wrongConfig = { ...postgresConfig, password: 'wrongpassword' };
      const isConnected = await testDatabaseConnection(wrongConfig);
      expect(isConnected).toBe(false);
    });

    it('should return false for an invalid Oracle connection', async () => {
      const wrongConfig = { ...oracleConfig, password: 'wrongpassword' };
      const isConnected = await testDatabaseConnection(wrongConfig);
      expect(isConnected).toBe(false);
    });
  });

  describe('getTables', () => {
    // --- PostgreSQL Tests ---
    it('should get PostgreSQL tables with columns', async () => {
      const tables = await getTables(postgresConfig, true);
      expect(tables.length).toBeGreaterThanOrEqual(2);

      const employeeTable = tables.find(t => t.name === 'orders');
      expect(employeeTable).toBeDefined();
      expect(employeeTable?.columns.length).toBeGreaterThan(0);
      expect(employeeTable?.columns.some(c => c.name === 'order_id' && c.isPrimaryKey)).toBe(true);
      expect(employeeTable?.columns.some(c => c.name === 'order_date')).toBe(true);
    });

    it('should get PostgreSQL tables without columns', async () => {
      const tables = await getTables(postgresConfig, false);
      expect(tables.length).toBeGreaterThanOrEqual(2);
      const departmentTable = tables.find(t => t.name === 'orders');
      expect(departmentTable).toBeDefined();
      expect(departmentTable?.columns.length).toBe(0);
    });

    // --- Oracle Tests ---
    it('should get Oracle tables with columns', async () => {
      const tables = await getTables(oracleConfig, true);
      // Oracle system tables might be present, so we check for our specific tables
      const employeeTable = tables.find(t => t.name === 'TEST_EMPLOYEES');
      expect(employeeTable).toBeDefined();
      expect(employeeTable?.columns.length).toBeGreaterThan(0);
      expect(employeeTable?.columns.some(c => c.name === 'EMP_ID' && c.isPrimaryKey)).toBe(true);
    });

    it('should get Oracle tables without columns', async () => {
      const tables = await getTables(oracleConfig, false);
      const productTable = tables.find(t => t.name === 'TEST_PRODUCTS');
      expect(productTable).toBeDefined();
      expect(productTable?.columns.length).toBe(0);
    });

    it('should throw an error when getting tables with invalid credentials', async () => {
      const wrongConfig = { ...postgresConfig, password: 'wrongpassword' };
      await expect(getTables(wrongConfig)).rejects.toThrow();
    });
  });
});

