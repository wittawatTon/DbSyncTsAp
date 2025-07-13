import { DatabaseClient } from './DatabaseClient.js';
import { OracleClient } from './oracle/OracleClient.js';
import { PostgresClient } from './postgres/PostgresClient.js';
import { MysqlClient } from './mysql/MysqlClient.js';
import { MssqlClient } from './mssql/MssqlClient.js';
import { IDbConnection } from '@core/models/dbConnection.model.js';

export class DatabaseFactory {
  static create(config: IDbConnection): DatabaseClient {
    switch (config.dbType) {
    case 'mysql':
      return new MysqlClient(config);
    case 'postgres':
      return new PostgresClient(config);
    case 'oracle':
      return new OracleClient(config);
    case 'mssql':
      return new MssqlClient(config);
    default:
      throw new Error(`Unsupported DB type: ${config.dbType}`);
    }
  }

}
