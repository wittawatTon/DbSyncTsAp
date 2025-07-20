import { ITable } from '@core/models/table.model.js';
import { IDbConnection } from '@core/models/dbConnection.model.js';

export interface DbIntrospector {
  testConnect(): Promise<boolean>;
  getTablesAndCols(withColumn: boolean): Promise<ITable[]>;
  createTableOnTarget(
    config: IDbConnection,
    tableName: string,
    sqlCmd: string
  ): Promise<boolean>;
  countRows(tableName: string): Promise<number>;
}


