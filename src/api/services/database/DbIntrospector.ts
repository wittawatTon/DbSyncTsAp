import { ITable } from '@core/models/table.model.js';

export interface DbIntrospector {
  testConnect(): Promise<boolean>;
  getTablesAndCols(withColumn: boolean): Promise<ITable[]>;

}
