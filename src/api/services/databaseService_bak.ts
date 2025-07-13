
import mysql, { Connection as MySqlConnection } from 'mysql2/promise';
import { Client as PgClient } from 'pg';

import sql, { config as SqlConfig } from 'mssql';
import type { ConnectionPool as MsSqlConnection } from 'mssql';
import oracledb, { Connection as OracleConnection } from 'oracledb';
import { IDbConnection,DbType } from '@core/models/dbConnection.model.js';

//TODO: must re-structure code sperate database and use database pool for performance improvement

export type SupportedDbConnection =
  | MySqlConnection
  | PgClient
  | MsSqlConnection
  | OracleConnection;

export async function createMysqlConnection(config: IDbConnection): Promise<MySqlConnection> {
  const connection = await mysql.createConnection({
    host: config.host,
    user: config.username,
    password: config.password,
    database: config.database,
    port: config.port,
  });
  return connection;
}



export async function createMssqlConnection(config: IDbConnection): Promise<MsSqlConnection> {
  const poolConfig: SqlConfig = {
    server: config.host,
    user: config.username,
    password: config.password,
    database: config.database,
    port: config.port,
    options: {
      encrypt: config.ssl || false, // ใช้ ssl ถ้าระบุ
      trustServerCertificate: !config.ssl, // เชื่อใบรับรองถ้าไม่ใช้ ssl
    },
  };

  const pool = new sql.ConnectionPool(poolConfig);
  await pool.connect();
  return pool;
}


export async function createOracleConnection(config: IDbConnection): Promise<oracledb.Connection> {
  return await oracledb.getConnection({
    user: config.username,
    password: config.password,
    connectString: `${config.host}:${config.port}/${config.database}`,
  });
}

export async function createPostgresConnection(config: IDbConnection): Promise<PgClient> {
  return await new PgClient({
    host: config.host,
    port: config.port,
    database: config.database,
    user: config.username,
    password: config.password,
  });
}

export async function testConnection(config: IDbConnection): Promise<boolean> {
  try {
    switch (config.dbType) {
      case 'mssql': {
        const pool = await createMssqlConnection(config);
        await pool.query('SELECT 1 AS TestConnection');
        console.log(`✅ Database "${config.database}" (MSSQL) connected successfully.`);
        await pool.close();
        break;
      }

      case 'mysql': {
        const connection = await createMysqlConnection(config);
        await connection.ping();
        console.log(`✅ Database "${config.database}" (MySQL) connected successfully.`);
        await connection.end();
        break;
      }

        case 'oracle': {
        const conn = await createOracleConnection(config);
        await conn.execute('SELECT 1 FROM dual');
        console.log(`✅ Database "${config.database}" (Oracle) connected successfully.`);
        await conn.close();
        break;
      }

        case 'postgres': {
        const client = await createPostgresConnection(config);  // <== คุณต้องมีฟังก์ชันนี้
        await client.query('SELECT 1');
        console.log(`✅ Database "${config.database}" (PostgreSQL) connected successfully.`);
        await client.end();
        break;
      }
      default:
        console.error(`❌ Unsupported database type: ${config.dbType}`);
        return false;
    }

    return true;
  } catch (error) {
    console.error(`❌ Database "${config.database}" (${config.dbType}) connection failed:`, error.message);
    return false;
    
  }
}

/**
 * Connect to a database of the specified type.
 * @param dbType Database type
 * @param config Connection config
 * @returns Connection object (type depends on dbType)
 */
export async function createConnectionByDbType(
  config: IDbConnection
): Promise<SupportedDbConnection> {
  switch (config.dbType) {
    case 'mysql':
      return await mysql.createConnection({
        host: config.host,
        port: config.port,
        user: config.username,
        password: config.password,
        database: config.database,
      });

    case 'postgres': {
      const pgClient = new PgClient({
        host: config.host,
        port: config.port,
        user: config.username,
        password: config.password,
        database: config.database,
      });
      await pgClient.connect();
      return pgClient;
    }

    case 'mssql': {
      const mssqlConfig = {
        user: config.username,
        password: config.password,
        server: config.host,
        port: config.port,
        database: config.database,
        options: {
          encrypt: false, // Set to true for Azure/SSL
          trustServerCertificate: true, // For development only
        },
      };
      return await sql.connect(mssqlConfig);
    }

    case 'oracle':
      return await oracledb.getConnection({
        user: config.username,
        password: config.password,
        connectString: `${config.host}:${config.port}/${config.database}`,
      });

    default:
      throw new Error('Unsupported database type');
  }
}

/**
 * Close a database connection.
 * @param dbType Database type
 * @param connection Connection object
 */
export async function closeConnection(
  dbType: DbType,
  connection: SupportedDbConnection | null | undefined
): Promise<void> {
  try {
    if (!connection) return;
    if (dbType === 'mysql' || dbType === 'postgres') {
      await (connection as any).end();
    } else {
      await (connection as any).close();
    }
  } catch {
    // Ignore close errors
  }
}

