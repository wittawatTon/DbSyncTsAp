import { describe, it, expect } from 'vitest';
import { IDbConnection } from '@core/models/dbConnection.model.js';
import { testDatabaseConnection, getTables } from '@core/services/databaseService.js';

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

describe('PostgreSQL Integration Tests', () => {

  describe('testDatabaseConnection', () => {
    it('should return true for a valid PostgreSQL connection', async () => {
      const isConnected = await testDatabaseConnection(postgresConfig);
      expect(isConnected).toBe(true);
    });

    it('should return false for an invalid PostgreSQL connection', async () => {
      const wrongConfig = { ...postgresConfig, password: 'wrongpassword' };
      const isConnected = await testDatabaseConnection(wrongConfig);
      expect(isConnected).toBe(false);
    });
  });

  describe('getTables', () => {
    it('should get PostgreSQL tables with columns', async () => {
      const tables = await getTables(postgresConfig, true);
      expect(tables.length).toBeGreaterThanOrEqual(2);

      const orderTable = tables.find(t => t.name === 'orders');
      expect(orderTable).toBeDefined();
      expect(orderTable?.columns.length).toBeGreaterThan(0);
      expect(orderTable?.columns.some(c => c.name === 'order_id' && c.isPrimaryKey)).toBe(true);
      expect(orderTable?.columns.some(c => c.name === 'order_date')).toBe(true);
    });

    it('should get PostgreSQL tables without columns', async () => {
      const tables = await getTables(postgresConfig, false);
      expect(tables.length).toBeGreaterThanOrEqual(2);
      const orderTable = tables.find(t => t.name === 'orders');
      expect(orderTable).toBeDefined();
      expect(orderTable?.columns.length).toBe(0);
    });
  });
});