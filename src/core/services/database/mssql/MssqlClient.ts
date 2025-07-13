import sql, { ConnectionPool, Transaction, IResult } from 'mssql';
import { DatabaseClient } from '../DatabaseClient.js';
import { IDbConnection } from '@core/models/dbConnection.model.js';

export class MssqlClient implements DatabaseClient {
  private pool!: ConnectionPool;
  private transaction: Transaction | null = null;
  private cache = new Map<string, any>();

  constructor(private readonly dbConnection: IDbConnection) {}

  async connect(): Promise<void> {
    try {
      const config: sql.config = {
        server: this.dbConnection.host,
        port: this.dbConnection.port,
        user: this.dbConnection.username,
        password: this.dbConnection.password,
        database: this.dbConnection.database,
        pool: {
          max: 10,
          min: 1,
          idleTimeoutMillis: 30000,
        },
        options: {
          encrypt: this.dbConnection.ssl || false, // For Azure
          trustServerCertificate: this.dbConnection.ssl, // Change to true for local dev / self-signed certs
        },
      };
      this.pool = await new sql.ConnectionPool(config).connect();
    } catch (error: any) {
      console.error(`[MssqlClient] Failed to connect: ${error.message}`);
      throw error;
    }
  }

  private getRequest(): sql.Request {
    if (this.transaction) {
      return new sql.Request(this.transaction);
    }
    return new sql.Request(this.pool);
  }

  private generateCacheKey(sql: string, params: any[]): string {
    return `${sql}|${JSON.stringify(params)}`;
  }

  /**
   * Executes a query.
   * NOTE: The current implementation for MSSQL does not support parameterized queries
   * due to a mismatch between the driver's named parameter requirement and the
   * generic interface's positional parameter array.
   */
  async query<T = any>(
    sqlString: string,
    params: any[] = [],
    useCache = false,
    retryCount = 3
  ): Promise<T[]> {
    const key = this.generateCacheKey(sqlString, params);
    if (useCache && this.cache.has(key)) {
      return this.cache.get(key);
    }

    const execQuery = async (): Promise<T[]> => {
      const request = this.getRequest();
      // TODO: Address the parameter mismatch. The `mssql` library uses named parameters
      // like `request.input('name', value)`, not a positional array.
      if (params.length > 0) {
        console.warn('[MssqlClient] Parameterized queries are not supported in this implementation. Parameters will be ignored.');
      }
      const result: IResult<T> = await request.query(sqlString);
      return result.recordset ?? [];
    };

    let lastError: any;
    for (let attempt = 1; attempt <= retryCount; attempt++) {
      try {
        const result = await execQuery();
        if (useCache) this.cache.set(key, result);
        return result;
      } catch (err) {
        lastError = err;
        console.warn(`[MssqlClient] Query failed (attempt ${attempt}/${retryCount}):`, (err as Error).message);
        await new Promise(res => setTimeout(res, 200 * attempt));
      }
    }

    console.error(`[MssqlClient] Query failed after ${retryCount} attempts`);
    throw lastError;
  }

  async beginTransaction(): Promise<void> {
    if (this.transaction) {
      throw new Error('Transaction already in progress.');
    }
    this.transaction = new sql.Transaction(this.pool);
    await this.transaction.begin();
  }

  async commit(): Promise<void> {
    if (this.transaction) {
      await this.transaction.commit();
      this.transaction = null;
    }
  }

  async rollback(): Promise<void> {
    if (this.transaction) {
      await this.transaction.rollback();
      this.transaction = null;
    }
  }

  async disconnect(): Promise<void> {
    if (this.transaction) {
      // It's good practice to rollback any pending transaction before disconnecting.
      await this.transaction.rollback();
      this.transaction = null;
    }
    if (this.pool) {
      await this.pool.close();
    }
  }

  getPool(): ConnectionPool {
    if (!this.pool) {
      throw new Error('Pool is not initialized. Did you forget to call connect()?');
    }
    return this.pool;
  }
}
