import { IDbConnection, DbType } from '@core/models/dbConnection.model.js';
import { createConnectionByDbType, closeConnection } from '@api/services/databaseService.js';
import { ITable } from '@core/models/table.model.js';
import { IColumn } from '@core/models/column.model.js';


/**
 * Creates a table on the target DB only if it doesn't exist.
 * @param config DB connection config
 * @param tableName Name of the table to check/create
 * @param sqlCmd SQL command to execute if the table doesn't exist
 * @returns true if the table was created
 * @throws if the table already exists or on DB errors
 */
export const createTableOnTarget = async (
  config: IDbConnection,
  tableName: string,
  sqlCmd: string
): Promise<boolean> => {
  const dbType: DbType = config.dbType;
  const dbName = config.database || config.username;
  let connection: any;

  try {
    connection = await createConnectionByDbType(config);
    let checkQuery: string;
    let tableExists = false;

    switch (dbType) {
      case 'mysql':
        checkQuery = `SELECT COUNT(*) AS count FROM information_schema.tables WHERE table_schema = '${dbName}' AND table_name = '${tableName}'`;
        const [mysqlRows] = await connection.query(checkQuery);
        tableExists = mysqlRows[0].count > 0;
        break;

      case 'postgresql':
        checkQuery = `SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '${tableName}'`;
        const pgResult = await connection.query(checkQuery);
        tableExists = parseInt(pgResult.rows[0].count) > 0;
        break;

      case 'mssql':
        checkQuery = `SELECT COUNT(*) AS count FROM information_schema.tables WHERE table_name = '${tableName}'`;
        const mssqlResult = await connection.request().query(checkQuery);
        tableExists = mssqlResult.recordset[0].count > 0;
        break;

      case 'oracle':
        checkQuery = `SELECT COUNT(*) FROM all_tables WHERE table_name = UPPER('${tableName}') AND owner = UPPER('${config.username}')`;
        const oraResult = await connection.execute(checkQuery);
        tableExists = oraResult.rows?.[0]?.[0] > 0;
        break;

      case 'db2i':
        const schema = config.username?.toUpperCase() || '';
        checkQuery = `SELECT COUNT(*) AS count FROM SYSCAT.TABLES WHERE TABNAME = '${tableName.toUpperCase()}' AND TABSCHEMA = '${schema}'`;
        const db2Result = await connection.query(checkQuery);
        const db2Rows = db2Result[0] || db2Result.rows || [];
        tableExists = db2Rows[0]?.count > 0;
        break;

      default:
        throw new Error(`❌ Unsupported database type: ${dbType}`);
    }

    if (tableExists) {
      throw new Error(`🚫 Table "${tableName}" already exists.`);
    }

    // Execute SQL command
    switch (dbType) {
      case 'mysql':
      case 'postgresql':
      case 'db2i':
        await connection.query(sqlCmd);
        break;
      case 'mssql':
        await connection.request().query(sqlCmd);
        break;
      case 'oracle':
        const schema = config.username.toUpperCase();
        const cleanedSqlCmd = sqlCmd.trim().replace(/;$/, '');
        await connection.execute(`ALTER SESSION SET CURRENT_SCHEMA = ${schema}`);
        await connection.execute(cleanedSqlCmd);
        
        break;
    }

    return true;
  } catch (err: any) {
    console.error(`❌ createTableOnTarget Error:`, err.message);
    throw new Error(err.message);
  } finally {
    await closeConnection(dbType, connection);
  }
};