import { Pool } from 'mysql2/promise';
import { DbIntrospector } from '../DbIntrospector.js';
import { ITable } from '@core/models/table.model.js';
import { IColumn } from '@core/models/column.model.js';

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
  // ดึงชื่อ table ใน database ปัจจุบัน (schema = database)
  const [rows] = await connection.query(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE() AND table_type = 'BASE TABLE'`
  ) as [Array<{ table_name: string }>, any];

  return rows.map(r => r.table_name);
}


  private async getTableColumns(connection: any, tableName: string): Promise<IColumn[]> {
    // ดึงคอลัมน์ พร้อมเช็ค primary key
    const sql = `
      SELECT 
        c.COLUMN_NAME AS name,
        c.DATA_TYPE AS dataType,
        CASE WHEN kcu.CONSTRAINT_NAME IS NOT NULL THEN 1 ELSE 0 END AS isPrimaryKey
      FROM information_schema.COLUMNS c
      LEFT JOIN information_schema.KEY_COLUMN_USAGE kcu 
        ON c.TABLE_SCHEMA = kcu.TABLE_SCHEMA
        AND c.TABLE_NAME = kcu.TABLE_NAME
        AND c.COLUMN_NAME = kcu.COLUMN_NAME
        AND kcu.CONSTRAINT_NAME IN (
          SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS
          WHERE TABLE_SCHEMA = c.TABLE_SCHEMA AND TABLE_NAME = c.TABLE_NAME AND CONSTRAINT_TYPE = 'PRIMARY KEY'
        )
      WHERE c.TABLE_SCHEMA = DATABASE() AND c.TABLE_NAME = ?
      ORDER BY c.ORDINAL_POSITION
    `;
    const [rows] = await connection.query(sql, [tableName]);
    return (rows as any[]).map(r => ({
      name: r.name,
      dataType: r.dataType,
      isPrimaryKey: r.isPrimaryKey === 1,
      selected: false,
    }));
  }
}
