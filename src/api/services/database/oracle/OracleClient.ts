import oracledb, { Pool, Connection } from 'oracledb';
import fs from 'fs';
import { DatabaseClient } from '../DatabaseClient.js';
import { IDbConnection } from '@core/models/dbConnection.model.js';

export class OracleClient implements DatabaseClient {
  private pool!: Pool;
  private connection: Connection | null = null;
  private cache = new Map<string, any>();

  constructor(private readonly dbConnection: IDbConnection) {
    oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
  }

  async connect(): Promise<void> {
    // ถ้า sslCertPath ไม่มีค่า หรือไม่ต้องใช้ SSL อาจปรับเพิ่มเงื่อนไขได้
    const sslCert = this.dbConnection.sslCertPath ? fs.readFileSync(this.dbConnection.sslCertPath, 'utf8') : undefined;

    this.pool = await oracledb.createPool({
      user: this.dbConnection.username,
      password: this.dbConnection.password,
      connectString: `${this.dbConnection.host}:${this.dbConnection.port}/${this.dbConnection.database}`,
      sslServerCertDN: sslCert,
      sslServerDNMatch: true,
      poolMin: 1,
      poolMax: 10,
      poolIncrement: 1,
    });
  }

  private async getConnection(): Promise<Connection> {
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
      const result = await conn.execute<T>(sql, params);
      return result.rows ?? [];
    };

    let lastError;
    for (let attempt = 1; attempt <= retryCount; attempt++) {
      try {
        const result = await execQuery();
        if (useCache) this.cache.set(key, result);
        return result;
      } catch (err) {
        lastError = err;
        console.warn(`Oracle query failed (attempt ${attempt}/${retryCount}):`, (err as Error).message);
        await new Promise(res => setTimeout(res, 200 * attempt));
      }
    }

    throw lastError;
  }

  async beginTransaction(): Promise<void> {
    // เริ่ม transaction ด้วยการเปิด connection ถ้ายังไม่มี
    await this.getConnection();
    // Note: Oracle auto-commit ปิดโดย default เมื่อใช้ connection
  }

  async commit(): Promise<void> {
    if (this.connection) {
      await this.connection.commit();
      await this.connection.close();
      this.connection = null;
    }
  }

  async rollback(): Promise<void> {
    if (this.connection) {
      await this.connection.rollback();
      await this.connection.close();
      this.connection = null;
    }
  }

  async disconnect(): Promise<void> {
    if (this.connection) {
      await this.connection.close();
      this.connection = null;
    }
    if (this.pool) {
      await this.pool.close(10); // timeout 10 วินาทีสำหรับปิด pool
    }
  }

  getPool(): Pool | undefined {
    return this.pool;
  }
}
