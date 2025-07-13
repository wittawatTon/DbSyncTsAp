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


/**
 * สร้างตารางบนฐานข้อมูลปลายทาง หากยังไม่มีตารางนั้นอยู่
 */
export async function createTableOnTarget(
  config: IDbConnection,
  tableName: string,
  sqlCmd: string
): Promise<boolean> {
  const client = DatabaseFactory.create(config);
  try {
    await client.connect();
    const pool = client.getPool();
    const introspector = IntrospectorFactory.create(config.dbType, pool);

    // ตรวจสอบว่าตารางมีอยู่หรือยัง
    const tables = await introspector.getTablesAndCols(false);
    const exists = tables.some(t => t.name === tableName);
    if (exists) {
      throw new Error(`Table "${tableName}" already exists.`);
    }

    // สั่งสร้างตารางด้วย SQL command ที่ส่งมา
    await introspector.createTableOnTarget(config, tableName, sqlCmd);

    return true;
  } catch (err: any) {
    console.error(`[databaseService] createTableOnTarget failed:`, err.message);
    throw err;
  } finally {
    await client.disconnect();
  }
}