import { Pool } from 'mysql2/promise';
import { DbIntrospector } from '../DbIntrospector.js';
import { ITable } from '@core/models/table.model.js';
import { IColumn } from '@core/models/column.model.js';
import { IDbConnection } from '@core/models/dbConnection.model.js';

export class MysqlIntrospector implements DbIntrospector {
  constructor(private pool: Pool) {}

  async testConnect(): Promise<boolean> {
    let connection;
    try {
      connection = await this.pool.getConnection();
      await connection.query('SELECT 1');
      return true;
    } catch (err: any) {
      console.error('[MysqlIntrospector] testConnect failed:', err.message);
      return false;
    } finally {
      if (connection) connection.release();
    }
  }

  async getTablesAndCols(withColumn: boolean = true): Promise<ITable[]> {
    let connection;
    try {
      connection = await this.pool.getConnection();

      const tableNames = await this.getTableNames(connection);

      if (!withColumn) {
        return tableNames.map(name => ({
          name,
          selected: false,
          columns: [],
        }));
      }

      const tables: ITable[] = [];

      for (const tableName of tableNames) {
        const columns = await this.getTableColumns(connection, tableName);
        tables.push({
          name: tableName,
          selected: false,
          columns,
        });
      }

      return tables;
    } catch (err: any) {
      console.error('[MysqlIntrospector] getTablesAndCols failed:', err.message);
      throw err;
    } finally {
      if (connection) connection.release();
    }
  }

private async getTableNames(connection: any): Promise<string[]> {
  // ใช้ SHOW TABLES เพื่อดึงชื่อ table ทั้งหมดใน database ปัจจุบัน
  const [rows] = await connection.query('SHOW TABLES');

  // key ของแต่ละ row จะเป็นชื่อ database เช่น "Tables_in_databasename"
  // เลยต้องดึง key แรกของ object มาใช้
  const key = Object.keys(rows[0])[0];

  return rows.map((row: any) => row[key]);
}

private async getTableColumns(connection: any, tableName: string): Promise<IColumn[]> {
  // ใช้ SHOW COLUMNS FROM เพื่อดึง column info และเช็ค primary key ผ่านคอลัมน์ Key
  const sql = `SHOW COLUMNS FROM \`${tableName}\``;
  const [rows] = await connection.query(sql);
  
  return (rows as any[]).map(r => ({
    name: r.Field,            // ชื่อ column
    dataType: r.Type,         // ชนิดข้อมูล
    isPrimaryKey: r.Key === 'PRI', // เช็คว่าเป็น primary key หรือไม่
    selected: false,
  }));
}

  async createTableOnTarget(
    config: IDbConnection,
    tableName: string,
    sqlCmd: string
  ): Promise<boolean> {
    let connection;
    try {
      connection = await this.pool.getConnection();

      const dbName = config.database;
      const [rows]: any = await connection.query(
        `SELECT COUNT(*) AS count FROM information_schema.tables WHERE table_schema = ? AND table_name = ?`,
        [dbName, tableName]
      );

      const exists = rows[0].count > 0;
      if (exists) {
        throw new Error(`🚫 Table "${tableName}" already exists.`);
      }

      const cleanedSql = sqlCmd.trim().replace(/;$/, '');
      await connection.query(cleanedSql);
      return true;
    } catch (err: any) {
      console.error('[MysqlIntrospector] createTableOnTarget failed:', err.message);
      throw new Error(err.message);
    } finally {
      if (connection) connection.release();
    }
  }
}
