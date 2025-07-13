import { Pool, PoolClient } from 'pg';
import fs from 'fs';
import { DatabaseClient } from '../DatabaseClient.js';
import { IDbConnection } from '@core/models/dbConnection.model.js';

export class PostgresClient implements DatabaseClient {
  private pool!: Pool;
  private client: PoolClient | null = null;
  private cache = new Map<string, any>();

  constructor(private readonly dbConnection: IDbConnection) {}

async connect(): Promise<void> {
  try {
    let ssl: boolean | { rejectUnauthorized: boolean; ca?: string } = false;

    if (this.dbConnection.ssl) {
      const sslCert = this.dbConnection.sslCertPath
        ? fs.readFileSync(this.dbConnection.sslCertPath, 'utf8')
        : undefined;

      ssl = {
        rejectUnauthorized: true,
        ...(sslCert && { ca: sslCert }),
      };
    }

    this.pool = new Pool({
      host: this.dbConnection.host,
      port: this.dbConnection.port,
      user: this.dbConnection.username,
      password: this.dbConnection.password,
      database: this.dbConnection.database,
      ssl,
      max: 10,
    });
  } catch (error: any) {
    console.error(`[PostgresClient] Failed to connect: ${error.message}`);
    throw error;
  }
}

  getPool(): Pool {
    if (!this.pool) {
      throw new Error('Pool is not initialized. Did you forget to call connect()?');
    }
    return this.pool;
  }

  private async getClient(): Promise<PoolClient> {
    try {
      if (!this.client) {
        this.client = await this.pool.connect();
      }
      return this.client;
    } catch (error) {
      console.error(`[PostgresClient] Failed to acquire client from pool: ${error.message}`);
      throw error;
    }
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
      const client = await this.getClient();
      try {
        const res = await client.query<T>(sql, params);
        return res.rows;
      } finally {
        client.release();
      }
    };

    let lastError: any;
    for (let attempt = 1; attempt <= retryCount; attempt++) {
      try {
        const result = await execQuery();
        if (useCache) this.cache.set(key, result);
        return result;
      } catch (err) {
        lastError = err;
        console.warn(`[PostgresClient] Query failed (attempt ${attempt}/${retryCount}): ${err.message}`);
        await new Promise(res => setTimeout(res, 200 * attempt)); // exponential backoff
      }
    }

    console.error(`[PostgresClient] Query failed after ${retryCount} attempts`);
    throw lastError;
  }

  async beginTransaction(): Promise<void> {
    try {
      const client = await this.getClient();
      await client.query('BEGIN');
    } catch (err) {
      console.error('[PostgresClient] beginTransaction failed:', err.message);
      throw err;
    }
  }

  async commit(): Promise<void> {
    if (this.client) {
      try {
        await this.client.query('COMMIT');
      } catch (err) {
        console.error('[PostgresClient] commit failed:', err.message);
        throw err;
      } finally {
        this.client.release();
        this.client = null;
      }
    }
  }

  async rollback(): Promise<void> {
    if (this.client) {
      try {
        await this.client.query('ROLLBACK');
      } catch (err) {
        console.error('[PostgresClient] rollback failed:', err.message);
        throw err;
      } finally {
        this.client.release();
        this.client = null;
      }
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.client) {
        this.client.release();
        this.client = null;
      }
      if (this.pool) {
        await this.pool.end();
      }
    } catch (err) {
      console.error('[PostgresClient] disconnect failed:', err.message);
    }
  }
}
