import { PipelineService  } from "@core/services/pipeline.service.js";
import { DatabaseFactory } from '@core/services/database/DatabaseFactory.js';
import { ConnectionConfigDocument } from '@core/models/dbConnection.model.js';

/**
 * สร้าง SQL สำหรับเปิดใช้งาน CDC ทั้งระดับ Database และ Table
 */
export function buildEnableCDCSql(
  config: ConnectionConfigDocument,
  tablesNotEnabled: string[],
  isDbCdcEnabled: boolean
): string[] {
  const sqls: string[] = [];

  if (!isDbCdcEnabled) {
    sqls.push(`EXEC sys.sp_cdc_enable_db;`);
  }

  for (const table of tablesNotEnabled) {
    const safeTable = table.replace(/'/g, "''");
    sqls.push(`
      EXEC sys.sp_cdc_enable_table
        @source_schema = N'dbo',
        @source_name   = N'${safeTable}',
        @role_name     = NULL,
        @supports_net_changes = 1;
    `.trim());
  }

  return sqls;
}

/**
 * ตรวจสอบว่า CDC เปิดใช้งานแล้วหรือยัง และหากยังให้สร้าง SQL ที่ต้องใช้
 */
export async function CheckEnableCDC(
  pipelineId: string
): Promise<{ enabled: boolean; enableSql?: string[] }> {
  const pipelineService = new PipelineService();
  const pipeline = await pipelineService.findByIdWithPopulate(pipelineId)


  if (!pipeline) throw new Error(`❌ Pipeline not found: ${pipelineId}`);
  const config = pipeline.sourceDbConnection;

  // ใช้ DatabaseFactory สร้าง client ที่ implement DatabaseClient interface
  const client = DatabaseFactory.create(config);

  try {
    await client.connect();

    if (config.dbType !== 'mssql') {
      throw new Error(`❌ CDC is only supported for MSSQL, got "${config.dbType}"`);
    }

    const tables = pipeline.sourceTables.map(t => t.name);

    // ตรวจสอบระดับ Database
    const dbCheckResult = await client.query<{ is_cdc_enabled: boolean }>(
      `SELECT is_cdc_enabled FROM sys.databases WHERE name = DB_NAME()`
    );
    const isDbCdcEnabled = dbCheckResult[0]?.is_cdc_enabled === true;

    // ตรวจสอบระดับ Table โดยรวมเป็น IN (...)
    if (tables.length === 0) {
      // ไม่มี tables ให้ตรวจสอบ => ถือว่า enabled หาก DB enabled
      return { enabled: isDbCdcEnabled };
    }

    const tableList = tables.map(t => `'${t.replace(/'/g, "''")}'`).join(',');

    const tableResult = await client.query<{ name: string; is_tracked_by_cdc: boolean }>(
      `SELECT name, is_tracked_by_cdc FROM sys.tables WHERE name IN (${tableList})`
    );

    const trackedTables = new Set(
      tableResult.filter(r => r.is_tracked_by_cdc === true).map(r => r.name)
    );

    const tablesNotEnabled = tables.filter(t => !trackedTables.has(t));

    const isCdcFullyEnabled = isDbCdcEnabled && tablesNotEnabled.length === 0;

    if (!isCdcFullyEnabled) {
      const sqls = buildEnableCDCSql(config, tablesNotEnabled, isDbCdcEnabled);
      return {
        enabled: false,
        enableSql: sqls,
      };
    }

    return { enabled: true };
  } catch (err: any) {
    console.error(`❌ Failed to check CDC: ${err.message}`);
    throw err;
  } finally {
    await client.disconnect();
  }
}

/**
 * เปิดใช้งาน CDC หากยังไม่ได้เปิด (ระดับ DB และ Table)
 */
export async function enableCDC(pipelineId: string): Promise<boolean> {
  const pipelineService = new PipelineService();
  const pipeline = await pipelineService.findByIdWithPopulate(pipelineId)

  if (!pipeline) throw new Error(`❌ Pipeline not found: ${pipelineId}`);
  const config = pipeline.sourceDbConnection;

  const { enabled, enableSql } = await CheckEnableCDC(pipelineId);

  if (enabled) return true;
  if (!enableSql || !Array.isArray(enableSql) || enableSql.length === 0) {
    throw new Error(`❌ CDC not enabled but no SQL returned to fix.`);
  }

  const client = DatabaseFactory.create(config);

  try {
    await client.connect();

    if (config.dbType !== 'mssql') {
      throw new Error(`❌ CDC is only supported for MSSQL, got "${config.dbType}"`);
    }

    for (const sql of enableSql) {
      await client.query(sql);
    }

    return true;
  } catch (err: any) {
    console.error(`❌ Failed to enable CDC: ${err.message}`);
    throw new Error(`Fail to enable CDC for pipeline ID: ${pipelineId}`);
  } finally {
    await client.disconnect();
  }
}

/**
 * กรณีต้องการโยน Error พร้อม SQL ที่ต้องใช้
 */
export class CDCNotEnabledError extends Error {
  sqlToEnable: string[];

  constructor(message: string, sql: string[]) {
    super(message);
    this.name = "CDCNotEnabledError";
    this.sqlToEnable = sql;
  }
}
