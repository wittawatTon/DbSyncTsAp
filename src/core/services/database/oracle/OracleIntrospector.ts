import oracledb, { Pool } from 'oracledb';
import { DbIntrospector } from '../DbIntrospector.js';
import { ITable } from '@core/models/table.model.js';
import { IColumn } from '@core/models/column.model.js';
import { IDbConnection } from '@core/models/dbConnection.model.js';

export class OracleIntrospector implements DbIntrospector {
  constructor(private pool: Pool) {}

  async testConnect(): Promise<boolean> {
    let connection;
    try {
      connection = await this.pool.getConnection();
      await connection.execute('SELECT 1 FROM DUAL');
      return true;
    } catch (err: any) {
      console.error('[OracleIntrospector] testConnect failed:', err.message);
      return false;
    } finally {
      if (connection) await connection.close();
    }
  }

  async getTablesAndCols(withColumn: boolean = true): Promise<ITable[]> {
    let connection;
    try {
      connection = await this.pool.getConnection();
      const username = await this.getCurrentUsername(connection);
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
        const columns = await this.getTableColumns(connection, username, tableName);
        tables.push({
          name: tableName,
          selected: false,
          columns,
        });
      }

      return tables;
    } catch (err: any) {
      console.error('[OracleIntrospector] getTablesAndCols failed:', err.message);
      throw err;
    } finally {
      if (connection) await connection.close();
    }
  }

  async createTableOnTarget(config: IDbConnection, tableName: string, sqlCmd: string): Promise<boolean> {
    let connection;
    try {
      connection = await this.pool.getConnection();
      const checkQuery = `
        SELECT COUNT(*) FROM all_tables
        WHERE table_name = UPPER(:tableName)
        AND owner = UPPER(:owner)
      `;
      const binds = {
        tableName,
        owner: config.username?.toUpperCase(),
      };

      const result = await connection.execute(checkQuery, binds);
      const exists = result.rows?.[0]?.[0] > 0;

      if (exists) {
        throw new Error(`🚫 Table "${tableName}" already exists.`);
      }

      const schema = config.username.toUpperCase();
      const cleanedSqlCmd = sqlCmd.trim().replace(/;$/, '');
      await connection.execute(`ALTER SESSION SET CURRENT_SCHEMA = ${schema}`);
      await connection.execute(cleanedSqlCmd);

      return true;
    } catch (err: any) {
      console.error('[OracleIntrospector] createTableOnTarget failed:', err.message);
      throw new Error(err.message);
    } finally {
      if (connection) await connection.close();
    }
  }

  private async getCurrentUsername(connection: any): Promise<string> {
    const result = await connection.execute('SELECT USER FROM DUAL');
  const rows = result.rows as Array<{ USER: string }>;
  return rows?.[0]?.USER.toUpperCase() || '';
  }

  private async getTableNames(connection: any): Promise<string[]> {
    const result = await connection.execute('SELECT table_name FROM user_tables');
  const rows = result.rows as Array<{ TABLE_NAME: string }>;
  return rows?.map(r => r.TABLE_NAME) || [];
  }

  private async getTableColumns(connection: any, owner: string, tableName: string): Promise<IColumn[]> {
    const sql = `
      SELECT
        col.column_name AS name,
        col.data_type AS dataType,
        CASE WHEN pk.column_name IS NOT NULL THEN 1 ELSE 0 END AS isPrimaryKey
      FROM (
        SELECT column_name, data_type
        FROM all_tab_columns
        WHERE table_name = :tableName AND owner = :owner
      ) col
      LEFT JOIN (
        SELECT column_name
        FROM all_constraints ac
        JOIN all_cons_columns acc ON ac.constraint_name = acc.constraint_name AND ac.owner = acc.owner
        WHERE ac.constraint_type = 'P' AND ac.owner = :owner AND ac.table_name = :tableName
      ) pk ON col.column_name = pk.column_name
    `;

    const binds = { tableName, owner };
    const result = await connection.execute(sql, binds);

    return (result.rows || []).map((r: any) => ({
    name: r.NAME,
    dataType: r.DATATYPE,
    isPrimaryKey: r.ISPRIMARYKEY === 1,
      selected: false,
    }));
  }
}
