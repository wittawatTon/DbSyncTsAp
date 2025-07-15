import { IDebeziumConnectorConfig } from "@core/models/type.js";
import { PipelineModel } from "@core/models/pipeline.model.js";
import getNextSequence from "@core/services/getNextSequence.js";
import { ConnectionConfigDocument } from "@core/models/dbConnection.model.js";
import { buildMssqlSinkConnectorConfig } from "./mssqlConnector.js";
import { buildOracleSinkConnectorConfig } from "./oracleConnector.js";
import { buildPostgresSinkConnectorConfig } from "./postgresConnector.js";



/**
 * สร้าง Debezium connector config ตาม dbType
 */
export const createSinkConnectJson = async (
   pipelineId: string,
): Promise<IDebeziumConnectorConfig> => {
      const pipeline = await PipelineModel.findById(pipelineId)
      .populate<{ sourceDbConnection: ConnectionConfigDocument }>('sourceDbConnection')
      .populate<{ targetDbConnection: ConnectionConfigDocument }>('targetDbConnection')
      .exec();
  
      if (!pipeline) throw new Error(`❌ Pipeline not found: ${pipelineId}`);
  
      const sourceConnection = pipeline.sourceDbConnection;
      const targetConnection = pipeline.targetDbConnection;
      const tables = pipeline.targetTables;

  if (!sourceConnection) throw new Error("❌ Missing sourceConnection in pipeline");
  if (!targetConnection) throw new Error("❌ Missing targetConnection in pipeline");
  if (!tables || tables.length === 0) throw new Error("❌ Missing or empty tables in pipeline");

  const serverId = await getNextSequence("serverId");

  switch (targetConnection.dbType) {
    case "oracle":
      return buildOracleSinkConnectorConfig(pipeline.id, sourceConnection, targetConnection, tables);
    case "postgres":
      return buildPostgresSinkConnectorConfig(pipeline.id, sourceConnection, targetConnection, tables);
    case "mssql":
      throw new Error(`❌ Unsupported dbType: ${sourceConnection.dbType}`);
      //return buildMssqlSinkConnectorConfig(pipeline,sourceConnection, targetConnection, tables);
    default:
      throw new Error(`❌ Unsupported dbType: ${sourceConnection.dbType}`);
  }
};
