import { IDbConnection } from '@core/models/dbConnection.model.js';
import { DbIntrospector } from '@core/services/database/DbIntrospector.js';
import { ITable } from '@core/models/table.model.js';

export abstract class DbIntrospectorBase implements DbIntrospector {
  
  abstract testConnect(): Promise<boolean>;
  abstract getTablesAndCols(withColumn: boolean): Promise<ITable[]>;
  abstract createTableOnTarget(config: IDbConnection, tableName: string, sqlCmd: string): Promise<boolean>;
  abstract countRows(tableName: string): Promise<number>;

  /**
   * ตรวจสอบชื่อ table ให้ปลอดภัยสำหรับ query
   * รองรับชื่อแบบ `dbo.TableName` หรือ `[dbo].[TableName]`
   */
  protected isSafeTableName(name: string): boolean {
    return /^[\w\.\[\]]+$/.test(name);
  }


}
