import { DbIntrospector } from './DbIntrospector.js';
import { PostgresIntrospector } from './postgres/PostgresIntrospector.js';
import { OracleIntrospector } from './oracle/OracleIntrospector.js';
import { MssqlIntrospector } from './mssql/MssqlIntrospector.js';
import { MysqlIntrospector } from './mysql/MysqlIntrospector.js';

import { ca } from 'zod/v4/locales';


export class IntrospectorFactory {
  static create(dbType: string, pool: any): DbIntrospector {
    switch (dbType) {
      case 'postgres': return new PostgresIntrospector(pool);
      case 'oracle': return new OracleIntrospector(pool);
      case 'mssql': return new MssqlIntrospector(pool);
      case 'mysql': return new MysqlIntrospector(pool);
      default: throw new Error(`Unsupported dbType for introspection: ${dbType}`);
    }
  }
}
