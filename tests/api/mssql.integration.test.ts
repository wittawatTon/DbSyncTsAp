import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { IDbConnection } from '@core/models/dbConnection.model.js';
import { testDatabaseConnection, getTables } from '@api/services/databaseService.js';
import { MssqlClient } from '@api/services/database/mssql/MssqlClient.js';

// Load environment variables from .env.test
import dotenv from 'dotenv';
dotenv.config({ path: '.env.test' });

const mssqlConfig: IDbConnection = {
  dbType: 'mssql',
  host: process.env.MSSQL_TEST_HOST!,
  port: parseInt(process.env.MSSQL_TEST_PORT!, 10),
  username: process.env.MSSQL_TEST_USER!,
  password: process.env.MSSQL_TEST_PASSWORD!,
  database: process.env.MSSQL_TEST_DB || 'testdb', // Use 'testdb' as default
  ssl: false,
};

// Config to connect to the master DB for setup/teardown
const masterConfig: IDbConnection = {
  ...mssqlConfig,
  database: 'master',
};

describe('MSSQL Integration Tests', () => {
  // Setup: Create test database and tables
  beforeAll(async () => {
    const masterClient = new MssqlClient(masterConfig);
    try {
      await masterClient.connect();
      console.log('Creating MSSQL test database...');
      await masterClient.query(`IF DB_ID('${mssqlConfig.database}') IS NULL CREATE DATABASE ${mssqlConfig.database}`);
      console.log('MSSQL test database created.');
    } catch (err: any) {
      console.error('Failed to create MSSQL test database:', err.message);
      throw err;
    } finally {
      await masterClient.disconnect();
    }

    // Now connect to the new DB to create tables
    const testDbClient = new MssqlClient(mssqlConfig);
    try {
      await testDbClient.connect();
      console.log('Setting up MSSQL test tables...');
      await testDbClient.query(`
        IF OBJECT_ID('test_employees', 'U') IS NULL
        CREATE TABLE test_employees ( emp_id INT PRIMARY KEY, emp_name VARCHAR(100) );
      `);
      await testDbClient.query(`
        IF OBJECT_ID('test_products', 'U') IS NULL
        CREATE TABLE test_products ( prod_id INT PRIMARY KEY, prod_desc VARCHAR(200) );
      `);
      console.log('MSSQL test tables are ready.');
    } catch (err: any) {
      console.error('Failed to create MSSQL tables:', err.message);
      throw err;
    } finally {
      await testDbClient.disconnect();
    }
  });

  // Teardown: Drop the test database
  afterAll(async () => {
    const masterClient = new MssqlClient(masterConfig);
    try {
      await masterClient.connect();
      console.log('Tearing down MSSQL test database...');
      await masterClient.query(`ALTER DATABASE ${mssqlConfig.database} SET SINGLE_USER WITH ROLLBACK IMMEDIATE;`);
      await masterClient.query(`DROP DATABASE ${mssqlConfig.database}`);
      console.log('MSSQL test database torn down.');
    } catch (err: any) {
      console.error('Failed to tear down MSSQL database:', err.message);
    } finally {
      await masterClient.disconnect();
    }
  });

  describe('testDatabaseConnection', () => {
    it('should return true for a valid MSSQL connection', async () => {
      const isConnected = await testDatabaseConnection(mssqlConfig);
      expect(isConnected).toBe(true);
    });

    it('should return false for an invalid MSSQL connection', async () => {
      const wrongConfig = { ...mssqlConfig, password: 'wrongpassword' };
      const isConnected = await testDatabaseConnection(wrongConfig);
      expect(isConnected).toBe(false);
    });
  });

  describe('getTables', () => {
    it('should get MSSQL tables with columns', async () => {
      const tables = await getTables(mssqlConfig, true);
      const employeeTable = tables.find(t => t.name === 'test_employees');
      expect(employeeTable).toBeDefined();
      expect(employeeTable?.columns.length).toBeGreaterThan(0);
      expect(employeeTable?.columns.some(c => c.name === 'emp_id' && c.isPrimaryKey)).toBe(true);
    });
  });
});