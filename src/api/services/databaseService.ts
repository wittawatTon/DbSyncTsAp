import { IDbConnection } from '@core/models/dbConnection.model.js';
import { DatabaseFactory } from './database/DatabaseFactory.js';
import { IntrospectorFactory } from './database/IntrospectorFactory.js';
import { ITable } from '@core/models/table.model.js';

/**
 * ทดสอบการเชื่อมต่อกับฐานข้อมูล
 */
export async function testDatabaseConnection(config: IDbConnection): Promise<boolean> {
  const client = DatabaseFactory.create(config);
  try {
    await client.connect();
    const pool = client.getPool();
    const introspector = IntrospectorFactory.create(config.dbType, pool);
    return await introspector.testConnect();
  } catch (err: any) {
    console.error(`[databaseService] testDatabaseConnection failed:`, err.message);
    return false;
  } finally {
    await client.disconnect();
  }
}

/**
 * ดึงรายชื่อ tables และ columns ทั้งหมด
 */
export async function getTables(config: IDbConnection,withColumn: boolean = true): Promise<ITable[]> {
  const client = DatabaseFactory.create(config);

  try {
    await client.connect();
    const pool = client.getPool();
    const introspector = IntrospectorFactory.create(config.dbType, pool);
    return await introspector.getTablesAndCols(withColumn);
  } catch (err: any) {
    console.error('[databaseService] getTablesAndColumns failed:', err.message);
    throw err;
  } finally {
    await client.disconnect();
  }
}
