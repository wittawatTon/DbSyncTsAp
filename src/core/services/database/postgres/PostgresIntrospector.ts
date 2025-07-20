import { Pool } from 'pg';
import { DbIntrospector } from '../DbIntrospector.js';
import { ITable } from '@core/models/table.model.js';
import { IColumn } from '@core/models/column.model.js';
import { IDbConnection } from '@core/models/dbConnection.model.js';
import { DbIntrospectorBase } from '../DbIntrospectorBase.js';


export class PostgresIntrospector extends DbIntrospectorBase  {
  constructor(private pool: Pool) {
    super();
  }

  async testConnect(): Promise<boolean> {
    let client;
    try {
      client = await this.pool.connect();
      await client.query('SELECT 1');
      return true;
    } catch (err: any) {
      console.error('[PostgresIntrospector] testConnect failed:', err.message);
      return false;
    } finally {
      client?.release();
    }
  }

  async getTablesAndCols(withColumn: boolean = true): Promise<ITable[]> {
    let client;
    try {
      client = await this.pool.connect();

      const tablesRes = await client.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
      `);

      const tableNames: string[] = tablesRes.rows.map(r => r.table_name);

      if (!withColumn) {
        return tableNames.map(name => ({
          name,
          selected: false,
          columns: [],
        }));
      }

      const tables: ITable[] = [];

      for (const tableName of tableNames) {
        const columns = await this.getColumns(client, tableName);
        tables.push({
          name: tableName,
          selected: false,
          columns,
        });
      }

      return tables;
    } catch (err: any) {
      console.error('[PostgresIntrospector] getTablesAndCols failed:', err.message);
      throw err;
    } finally {
      client?.release();
    }
  }

  private async getColumns(client: any, tableName: string): Promise<IColumn[]> {
    const res = await client.query(
      `SELECT
          c.column_name,
          c.data_type,
          (CASE WHEN tc.constraint_type = 'PRIMARY KEY' THEN true ELSE false END) AS is_primary_key
        FROM information_schema.columns c
        LEFT JOIN information_schema.key_column_usage kcu
          ON c.table_name = kcu.table_name
          AND c.column_name = kcu.column_name
          AND c.table_schema = kcu.table_schema
        LEFT JOIN information_schema.table_constraints tc
          ON kcu.constraint_name = tc.constraint_name
          AND kcu.table_schema = tc.table_schema
          AND tc.constraint_type = 'PRIMARY KEY'
        WHERE c.table_name = $1
          AND c.table_schema = 'public'
        ORDER BY c.ordinal_position;`,
      [tableName]
    );

    return res.rows.map((r: any) => ({
      name: r.column_name,
      dataType: r.data_type,
      isPrimaryKey: r.is_primary_key===true,
      selected: false,
    }));
  }

  async createTableOnTarget(
    config: IDbConnection,
    tableName: string,
    sqlCmd: string
  ): Promise<boolean> {
    let client;
    try {
      client = await this.pool.connect();

      const checkQuery = `
        SELECT COUNT(*) FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = $1;
      `;

      const checkResult = await client.query(checkQuery, [tableName]);
      const exists = parseInt(checkResult.rows[0].count) > 0;

      if (exists) {
        throw new Error(`🚫 Table "${tableName}" already exists.`);
      }

      const cleanedSql = sqlCmd.trim().replace(/;$/, '');
      await client.query(cleanedSql);

      return true;
    } catch (err: any) {
      console.error('[PostgresIntrospector] createTableOnTarget failed:', err.message);
      throw new Error(err.message);
    } finally {
      client?.release();
    }
  }

  async countRows(tableName: string): Promise<number> {
  if (!this.isSafeTableName(tableName)) {
    throw new Error(`Invalid table name: ${tableName}`);
  }

  let client;
  try {
    client = await this.pool.connect();

    // ใช้ quoteIdentifier ครอบ tableName เช่น "schema"."table"
    const safeName = this.quoteIdentifier(tableName);

    const result = await client.query(`SELECT COUNT(*) AS count FROM ${safeName}`);
    return parseInt(result.rows[0].count, 10);
  } catch (err: any) {
    console.error('[PostgresIntrospector] countRows failed:', err.message);
    throw err;
  } finally {
    client?.release();
  }
}

// ถ้ายังไม่มี ให้เพิ่ม method quoteIdentifier (Oracle กับ Postgres ใช้ " ครอบ identifier)
protected quoteIdentifier(name: string): string {
  return name
    .split('.')
    .map(part => part.startsWith('"') ? part : `"${part}"`)
    .join('.');
}

// isSafeTableName (ใช้ regex ให้เหมาะสม)
protected isSafeTableName(name: string): boolean {
  return /^[\w\.""]+$/.test(name);
}

}
