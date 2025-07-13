import mysql, { Pool, PoolConnection } from 'mysql2/promise';
import { DatabaseClient } from '../DatabaseClient.js';
import { IDbConnection } from '@core/models/dbConnection.model.js';

export class MysqlClient implements DatabaseClient {
  private pool!: Pool;
  private connection: PoolConnection | null = null;
  private cache = new Map<string, any>();

  constructor(private readonly dbConnection: IDbConnection) {}

  async connect(): Promise<void> {
    this.pool = mysql.createPool({
      host: this.dbConnection.host,
      port: this.dbConnection.port,
      user: this.dbConnection.username,
      password: this.dbConnection.password,
      database: this.dbConnection.database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      ssl: this.dbConnection.ssl
        ? {
            // ถ้าใช้ SSL แบบ certificate
            ca: await import('fs').then(fs => fs.readFileSync(this.dbConnection.sslCertPath!, 'utf8')),
          }
        : undefined,
    });
  }

  private async getConnection(): Promise<PoolConnection> {
    if (!this.connection) {
      this.connection = await this.pool.getConnection();
    }
    return this.connection;
  }

  private generateCacheKey(sql: string, params: any[]): string {
    return `${sql}|${JSON.stringify(params)}`;
  }

  async query<T = any>(
    sql: string,
    params: any[] = [],
    useCache = false,
    retryCount = 3
  ): Promise<T[]> {
    const key = this.generateCacheKey(sql, params);
    if (useCache && this.cache.has(key)) {
      return this.cache.get(key);
    }

    const execQuery = async (): Promise<T[]> => {
      const conn = await this.getConnection();
      const [rows] = await conn.query(sql, params);
      return rows as T[];
    };


    let lastError: any;
    for (let attempt = 1; attempt <= retryCount; attempt++) {
      try {
        const result = await execQuery();
        if (useCache) this.cache.set(key, result);
        return result;
      } catch (err: any) {
        lastError = err;
        console.warn(`MysqlClient query failed (attempt ${attempt}/${retryCount}):`, err.message);
        await new Promise(res => setTimeout(res, 200 * attempt));
      }
    }

    throw lastError;
  }

  async beginTransaction(): Promise<void> {
    const conn = await this.getConnection();
    await conn.beginTransaction();
  }

  async commit(): Promise<void> {
    if (this.connection) {
      await this.connection.commit();
      await this.connection.release();
      this.connection = null;
    }
  }

  async rollback(): Promise<void> {
    if (this.connection) {
      await this.connection.rollback();
      await this.connection.release();
      this.connection = null;
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.connection) {
        await this.connection.release();
        this.connection = null;
      }
      if (this.pool) {
        await this.pool.end();
      }
    } catch (err: any) {
      console.error('[MysqlClient] disconnect failed:', err.message);
    }
  }

  getPool(): Pool | undefined {
    return this.pool;
  }
}
