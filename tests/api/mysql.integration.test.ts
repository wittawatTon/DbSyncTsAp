import { describe, it, expect } from 'vitest';
import { IDbConnection } from '@core/models/dbConnection.model.js';
import { testDatabaseConnection, getTables } from '@api/services/databaseService.js';

// Load environment variables from .env.test
import dotenv from 'dotenv';
dotenv.config({ path: '.env.test' });

const mysqlConfig: IDbConnection = {
  dbType: 'mysql',
  host: process.env.MYSQL_TEST_HOST!,
  port: parseInt(process.env.MYSQL_TEST_PORT!, 10),
  username: process.env.MYSQL_TEST_USER!,
  password: process.env.MYSQL_TEST_PASSWORD!,
  database: process.env.MYSQL_TEST_DB!,
  ssl: false,
};

describe('MySQL Integration Tests', () => {
  it('should have MySQL config loaded from .env.test', () => {
    expect(mysqlConfig.host).toBeDefined();
    expect(mysqlConfig.port).not.toBeNaN();
  });

  describe('testDatabaseConnection', () => {
    it('should return true for a valid MySQL connection', async () => {
      const isConnected = await testDatabaseConnection(mysqlConfig);
      expect(isConnected).toBe(true);
    });

    it('should return false for an invalid MySQL connection', async () => {
      const wrongConfig = { ...mysqlConfig, password: 'wrongpassword' };
      const isConnected = await testDatabaseConnection(wrongConfig);
      expect(isConnected).toBe(false);
    });
  });

  describe('getTables', () => {
    it('should get MySQL tables with columns', async () => {
      const tables = await getTables(mysqlConfig, true);
      expect(tables.length).toBeGreaterThanOrEqual(2);

      const orderTable = tables.find(t => t.name === 'orders');
      expect(orderTable).toBeDefined();
      expect(orderTable?.columns.length).toBeGreaterThan(0);
      expect(orderTable?.columns.some(c => c.name === 'order_id' && c.isPrimaryKey)).toBe(true);
      expect(orderTable?.columns.some(c => c.name === 'order_date')).toBe(true);
    });

    it('should get MySQL tables without columns', async () => {
      const tables = await getTables(mysqlConfig, false);
      expect(tables.length).toBeGreaterThanOrEqual(2);
      const orderTable = tables.find(t => t.name === 'orders');
      expect(orderTable).toBeDefined();
      expect(orderTable?.columns.length).toBe(0);
    });
  });
});