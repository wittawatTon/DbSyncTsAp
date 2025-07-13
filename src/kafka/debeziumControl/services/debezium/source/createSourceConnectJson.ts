import { IDebeziumConnectorConfig } from "@core/models/type.js";
import { PipelineModel } from "@core/models/pipeline.model.js";
import getNextSequence from "@core/services/getNextSequence.js";
import { ConnectionConfigDocument } from "@core/models/connectionConfig.model.js";
import { buildMysqlConnectorConfig } from "./mysqlConnector.js";
import { buildMssqlConnectorConfig } from "./mssqlConnector.js";
import { buildOracleConnectorConfig } from "./oracleConnector.js";


/**
 * สร้าง Debezium connector config ตาม dbType
 */
export const createSourceConnectJson = async (
   pipelineId: string,
): Promise<IDebeziumConnectorConfig> => {
      const pipeline = await PipelineModel.findById(pipelineId)
      .populate<{ sourceDbConnection: ConnectionConfigDocument }>('sourceDbConnection')
      .exec();
  
      if (!pipeline) throw new Error(`❌ Pipeline not found: ${pipelineId}`);
  
      const sourceConnection = pipeline.sourceDbConnection;
      const tables = pipeline.sourceTables;

  if (!sourceConnection) throw new Error("❌ Missing sourceConnection in syncTask");
  if (!tables || tables.length === 0) throw new Error("❌ Missing or empty tables in syncTask");

  const serverId = await getNextSequence("serverId");

  switch (sourceConnection.dbType) {
    case "oracle":
      //TODO: Create/Modify config json for OpenLogReplication
      return buildOracleConnectorConfig(pipeline.id, sourceConnection, tables, serverId);
    case "mysql":
      throw new Error(`❌ Unsupported dbType: ${sourceConnection.dbType}`);
      //return buildMysqlConnectorConfig(sourceConnection, tables, serverId);
    case "mssql":
      return buildMssqlConnectorConfig(pipeline.id, sourceConnection, tables, serverId);
    default:
      throw new Error(`❌ Unsupported dbType: ${sourceConnection.dbType}`);
  }
};
