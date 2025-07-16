// @core/services/connectors/ConnectorFactory.ts
import { IConnectorBuilder  } from "./IConnectorBuilder.js";
import { ConnectorType } from "@core/models/type.js";
import { MysqlConnectorBuilder } from "./source/MysqlConnectorBuilder.js"
import { MssqlConnectorBuilder } from "./source/MssqlConnectorBuilder.js"
import { OracleConnectorBuilder } from "./source/OracleConnectorBuilder.js"
import { PostgresConnectorBuilder } from "./source/PostgresConnectorBuilder.js"

import { MysqlSinkConnectorBuilder } from "./sink/MysqlSinkConnectorBuilder.js"
import { MssqlSinkConnectorBuilder } from "./sink/MssqlSinkConnectorBuilder.js"
import { OracleSinkConnectorBuilder } from "./sink/OracleSinkConnectorBuilder.js"
import { PostgresSinkConnectorBuilder } from "./sink/PostgresSinkConnectorBuilder.js"


const builders: IConnectorBuilder[] = [
  new MysqlConnectorBuilder(),
  new MssqlConnectorBuilder(),
  new OracleConnectorBuilder(),
  new MysqlSinkConnectorBuilder(),
  new MssqlSinkConnectorBuilder(),
  new OracleSinkConnectorBuilder(),
  new PostgresConnectorBuilder(),
  new PostgresSinkConnectorBuilder(),
];

export class ConnectorFactory {
  static getBuilder(dbType: string, connectorType: ConnectorType): IConnectorBuilder {
    const builder = builders.find(
      (b) => b.name === dbType && b.type === connectorType
    );
    if (!builder) {
      throw new Error(`❌ Unsupported dbType: ${dbType} with connector type: ${connectorType}`);
    }
    return builder;
  }
}
