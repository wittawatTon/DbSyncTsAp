export interface DatabaseClient {
  connect(): Promise<void>;
  query<T = any>(sql: string, params?: any[], useCache?: boolean, retryCount?: number): Promise<T[]>;
  beginTransaction(): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
  disconnect(): Promise<void>;
    /**
   * ดึง connection pool ที่ใช้งาน (เช่นสำหรับ introspection หรือ query ตรง)
   */
  getPool(): unknown;
}
