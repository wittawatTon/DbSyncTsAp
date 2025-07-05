import { IDbConnection, DbType } from '@core/models/dbConnection.model.js';
import { createConnectionByDbType, closeConnection } from '@api/services/databaseService.js';
import { ITable } from '@core/models/table.model.js';
import { IColumn } from '@core/models/column.model.js';


import oracledb from "oracledb";

/**
 * Map of functions to get columns for each supported DB type.
 */
const getColumnsByTable: Record<
  DbType,
  (connection: any, tableName: string, usernameOrDb?: string) => Promise<IColumn[]>
> = {
  mysql: async (connection, tableName) => {
    const [columns] = await connection.query(`SHOW COLUMNS FROM \`${tableName}\``);
    return columns.map((col: any): IColumn => ({
      name: col.Field,
      dataType: col.Type,
      isPrimaryKey: col.Key === 'PRI',
      selected: true,
    }));
  },

  postgresql: async (connection, tableName) => {
    const result = await connection.query(`
      SELECT
        a.attname AS name,
        format_type(a.atttypid, a.atttypmod) AS type,
        coalesce(i.indisprimary, false) AS is_primary
      FROM pg_attribute a
      LEFT JOIN pg_index i ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
      WHERE a.attrelid = '${tableName}'::regclass
        AND a.attnum > 0 AND NOT a.attisdropped;
    `);
    return result.rows.map((col: any): IColumn => ({
      name: col.name,
      dataType: col.type,
      isPrimaryKey: col.is_primary,
      selected: false,
    }));
  },

  mssql: async (connection, tableName) => {
    const result = await connection.request().query(`
      SELECT 
        c.COLUMN_NAME AS name,
        c.DATA_TYPE AS type,
        CASE WHEN kcu.COLUMN_NAME IS NOT NULL THEN 1 ELSE 0 END AS isPrimaryKey
      FROM INFORMATION_SCHEMA.COLUMNS c
      LEFT JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
        ON c.TABLE_NAME = kcu.TABLE_NAME AND c.COLUMN_NAME = kcu.COLUMN_NAME
        AND OBJECTPROPERTY(OBJECT_ID(kcu.CONSTRAINT_NAME), 'IsPrimaryKey') = 1
      WHERE c.TABLE_NAME = '${tableName}';
    `);
    return result.recordset.map((col: any): IColumn => ({
      name: col.name,
      dataType: col.type,
      isPrimaryKey: col.isPrimaryKey === 1,
      selected: false,
    }));
  },


oracle: async (connection, tableName, username) => {
  const upperUser = username.toUpperCase();
  const upperTable = tableName;
   const sql = `
    SELECT
      col.column_name AS name,
      col.data_type AS dataType,
      CASE 
        WHEN pk.column_name IS NOT NULL THEN 1 ELSE 0
      END AS isPrimaryKey
    FROM (
      SELECT atc.table_name, atc.column_name, atc.data_type
      FROM all_tab_columns atc
      WHERE atc.table_name = :tableName
        AND atc.owner = :owner
    ) col
    LEFT JOIN (
      SELECT acc.table_name, acc.column_name
      FROM all_constraints ac
      JOIN all_cons_columns acc
        ON ac.constraint_name = acc.constraint_name
        AND ac.owner = acc.owner
      WHERE ac.constraint_type = 'P'
        AND ac.owner = :owner
        AND ac.table_name = :tableName
    ) pk
      ON col.table_name = pk.table_name AND col.column_name = pk.column_name
  `;

  const binds = { tableName: upperTable, owner: upperUser };

  // ✅ Debug actual SQL and binds
  console.log("🧪 Executing SQL:\n", sql);
  console.log("📌 With binds:\n", binds);

  const result = await connection.execute(
    sql,
    binds,
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );

  console.table(result.rows); // Optional: ดูค่าที่คืนมาจริง

  return (result.rows || []).map((row: any): IColumn => ({
    name: row.NAME,
    dataType: row.DATATYPE,
    isPrimaryKey: row.ISPRIMARYKEY === 1,
    selected: true,
  }));
},


  db2luw: async () => {
    throw new Error("❌ DB2 LUW is not supported yet. Please use DB2 for i (db2i) instead.");
  },

  db2i: async (connection, tableName, schema) => {
    // schema: DB2 uses schema (usually uppercase username) to qualify tables
    // Get columns and primary key info from DB2 system catalog
    // If schema not provided, fallback to current user
    const effectiveSchema = schema ? schema.toUpperCase() : undefined;
    // Get columns
    const columnsResult = await connection.query(`
      SELECT COLNAME AS name, TYPENAME AS type
      FROM SYSCAT.COLUMNS
      WHERE TABNAME = '${tableName.toUpperCase()}'
        ${effectiveSchema ? `AND TABSCHEMA = '${effectiveSchema}'` : ''}
      ORDER BY COLNO
    `);

    // Get primary key columns
    const pkResult = await connection.query(`
      SELECT k.COLNAME
      FROM SYSCAT.TABCONST c
      JOIN SYSCAT.KEYCOLUSE k
        ON c.CONSTNAME = k.CONSTNAME AND c.TABSCHEMA = k.TABSCHEMA
      WHERE c.TABNAME = '${tableName.toUpperCase()}'
        ${effectiveSchema ? `AND c.TABSCHEMA = '${effectiveSchema}'` : ''}
        AND c.TYPE = 'P'
    `);

    const pkCols = new Set(
      (pkResult[0] || pkResult.rows || []).map((row: any) => row.COLNAME)
    );

    // DB2 drivers may return result in [rows, meta] or { rows }
    const rows = columnsResult[0] || columnsResult.rows || [];
    return rows.map((col: any): IColumn => ({
      name: col.name || col.COLNAME,
      dataType: col.type || col.TYPENAME,
      isPrimaryKey: pkCols.has(col.name || col.COLNAME),
      selected: false,
    }));
  },
};

/**
 * Get tables and columns from a database connection.
 * @param config Database connection config (must include type)
 * @param withColumn Whether to include columns for each table (default: true)
 * @returns Array of ITable
 */
export const getTables = async (
  config: IDbConnection,
  withColumn: boolean = true
): Promise<ITable[]> => {
  const dbType: DbType = config.dbType;
  let connection: any;
  try {
    connection = await createConnectionByDbType(config);

    let tableNames: string[] = [];
    switch (dbType) {
      case 'mysql': {
        const [rows] = await connection.query('SHOW TABLES');
        tableNames = rows.map((row: any) => row[`Tables_in_${config.database}`]);
        break;
      }
      case 'postgresql': {
        const result = await connection.query(`
          SELECT table_name
          FROM information_schema.tables
          WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
        `);
        tableNames = result.rows.map((row: any) => row.table_name);
        break;
      }
      case 'mssql': {
        const result = await connection.request().query(`
          SELECT table_name
          FROM information_schema.tables
          WHERE table_type = 'BASE TABLE';
        `);
        tableNames = result.recordset.map((row: any) => row.table_name);
        break;
      }
      case 'oracle': {
        const result = await connection.execute(`
          SELECT table_name FROM all_tables WHERE owner = UPPER('${config.username}')
        `);
        tableNames = result.rows.map((row: any[]) => row[0]);
        break;
      }
      case 'db2i': {
        // DB2: get all user tables in schema
        const schema = config.username ? config.username.toUpperCase() : undefined;
        const tablesResult = await connection.query(`
          SELECT TABNAME FROM SYSCAT.TABLES
          WHERE TYPE = 'T'
            ${schema ? `AND TABSCHEMA = '${schema}'` : ''}
        `);
        const rows = tablesResult[0] || tablesResult.rows || [];
        tableNames = rows.map((row: any) => row.TABNAME);
        break;
      }
      default:
        throw new Error(`Unsupported database type: ${dbType}`);
    }

    const tables: ITable[] = [];
    for (const tableName of tableNames) {
      let columns: IColumn[] = [];
      if (withColumn) {
        try {
          const getColumns = getColumnsByTable[dbType];
          if (dbType === 'oracle'){
           columns = await getColumns(connection, tableName,  config.username);
          }else{
            columns = await getColumns(connection, tableName, config.database || config.username);
          }

          
        } catch (err: any) {
          console.warn(`Warning: Skipped columns for ${tableName}: ${err.message}`);
        }
      }

      tables.push({
        name: tableName,
        selected: false,
        columns,
      });
    }

    return tables;
  } catch (err: any) {
    if (err.code === 'ER_ACCESS_DENIED_ERROR') {
      throw new Error('Access denied. Please check credentials and permissions.');
    } else if (err.message?.includes('getaddrinfo ENOTFOUND') || err.message?.includes('ECONNREFUSED')) {
      throw new Error('Connection refused. Please check the host and port.');
    } else if (err.code === 'ER_BAD_DB_ERROR') {
      console.error('Unknown database: The specified database does not exist');
    } else {
      console.error('Database error:', err);
    }
    throw new Error(`Database error: ${err.message}`);
  } finally {
    await closeConnection(dbType, connection);
  }
};

export default {
  getTables,
};
