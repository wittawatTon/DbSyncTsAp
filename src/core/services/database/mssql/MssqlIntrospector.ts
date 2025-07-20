import sql, { ConnectionPool } from 'mssql';
import { ITable } from '@core/models/table.model.js';
import { IColumn } from '@core/models/column.model.js';
import { IDbConnection } from '@core/models/dbConnection.model.js';
import { DbIntrospectorBase } from '../DbIntrospectorBase.js';

export class MssqlIntrospector extends DbIntrospectorBase {
  constructor(private pool: ConnectionPool) {
    super();
  }

  /** ตรวจสอบการเชื่อมต่อกับ MSSQL */
  async testConnect(): Promise<boolean> {
    try {
      await this.pool.request().query('SELECT 1');
      return true;
    } catch (err: any) {
      console.error('[MssqlIntrospector] testConnect failed:', err.message);
      return false;
    }
  }

  /** ดึงตารางทั้งหมด (พร้อม columns ถ้าระบุ) */
  async getTablesAndCols(withColumn: boolean = true): Promise<ITable[]> {
    try {
      const request = this.pool.request();
      const tablesResult = await request.query<{
        TABLE_NAME: string;
        TABLE_SCHEMA: string;
      }>(`
        SELECT TABLE_NAME, TABLE_SCHEMA
        FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_TYPE = 'BASE TABLE';
      `);

      const tablesData = tablesResult.recordset;

      if (!withColumn) {
        return tablesData.map(t => ({
          name: t.TABLE_NAME,
          schema: t.TABLE_SCHEMA,
          selected: false,
          columns: [],
        }));
      }

      const tables: ITable[] = [];
      for (const tableData of tablesData) {
        const columns = await this.getColumns(tableData.TABLE_NAME, tableData.TABLE_SCHEMA);
        tables.push({
          name: tableData.TABLE_NAME,
          schema: tableData.TABLE_SCHEMA,
          selected: false,
          columns,
        });
      }

      return tables;
    } catch (err: any) {
      console.error('[MssqlIntrospector] getTablesAndCols failed:', err.message);
      throw err;
    }
  }

  /** ดึง columns ของตารางจาก schema */
  private async getColumns(tableName: string, tableSchema: string): Promise<IColumn[]> {
    const request = this.pool.request();
    request.input('tableName', sql.NVarChar, tableName);
    request.input('tableSchema', sql.NVarChar, tableSchema);

    const result = await request.query<{
      column_name: string;
      data_type: string;
      is_primary_key: boolean;
    }>(`
      SELECT
          c.COLUMN_NAME AS column_name,
          c.DATA_TYPE AS data_type,
          CAST(IIF(tc.CONSTRAINT_TYPE = 'PRIMARY KEY', 1, 0) AS bit) AS is_primary_key
      FROM INFORMATION_SCHEMA.COLUMNS c
      LEFT JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
          ON c.TABLE_SCHEMA = kcu.TABLE_SCHEMA AND c.TABLE_NAME = kcu.TABLE_NAME AND c.COLUMN_NAME = kcu.COLUMN_NAME
      LEFT JOIN INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
          ON kcu.TABLE_SCHEMA = tc.TABLE_SCHEMA AND kcu.CONSTRAINT_NAME = tc.CONSTRAINT_NAME AND tc.CONSTRAINT_TYPE = 'PRIMARY KEY'
      WHERE c.TABLE_NAME = @tableName AND c.TABLE_SCHEMA = @tableSchema
      ORDER BY c.ORDINAL_POSITION;
    `);

    return result.recordset.map(r => ({
      name: r.column_name,
      dataType: r.data_type,
      isPrimaryKey: r.is_primary_key,
      selected: false,
    }));
  }

  /** สร้างตารางใหม่จาก SQL command */
  async createTableOnTarget(config: IDbConnection, tableName: string, sqlCmd: string): Promise<boolean> {
    try {
      const request = this.pool.request();
      request.input('tableName', sql.NVarChar, tableName);

      const checkResult = await request.query(`
        SELECT COUNT(*) AS count FROM information_schema.tables
        WHERE table_name = @tableName
      `);

      const exists = checkResult.recordset[0].count > 0;

      if (exists) {
        throw new Error(`🚫 Table "${tableName}" already exists.`);
      }

      const cleanedSql = sqlCmd.trim().replace(/;$/, '');
      await this.pool.request().query(cleanedSql);

      return true;
    } catch (err: any) {
      console.error('[MssqlIntrospector] createTableOnTarget failed:', err.message);
      throw new Error(err.message);
    }
  }

  protected quoteIdentifier(name: string): string {
  return name
    .split('.')
    .map(part => part.startsWith('[') ? part : `[${part}]`)
    .join('.');
  }

  /** นับจำนวน row ในตาราง (ตรวจสอบชื่อก่อน) */
async countRows(tableName: string): Promise<number> {
  if (!this.isSafeTableName(tableName)) {
    throw new Error(`Invalid table name: ${tableName}`);
  }

  // ใส่ [] ครอบแต่ละส่วน (เช่น dbo.MyTable → [dbo].[MyTable])
  const safeTableName = this.quoteIdentifier(tableName);

  const result = await this.pool.request().query(`SELECT COUNT(*) as count FROM ${safeTableName}`);
  return result.recordset[0].count;
}
}
