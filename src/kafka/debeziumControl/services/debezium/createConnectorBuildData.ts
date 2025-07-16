import { PipelineService  } from "@core/services/pipeline.service.js";
import getNextSequence from "@core/services/getNextSequence.js";
import {generateConnectorNamesFromPipeline} from "@kafka/debeziumControl/services/pipelineService.js"
import { IConnectorBuildData } from "./IConnectorBuilder.js";


export const createConnectorBuildData  = async (
   pipelineId: string,
): Promise<IConnectorBuildData> => {
      const pipelineService = new PipelineService();
      const pipeline = await pipelineService.findByIdWithPopulate(pipelineId)

      if (!pipeline) throw new Error(`❌ Pipeline not found: ${pipelineId}`);
  
      const sourceConnection = pipeline.sourceDbConnection;
      const targetConnection = pipeline.targetDbConnection;

  if (!sourceConnection) throw new Error("❌ Missing sourceConnection in syncTask");
  if (!pipeline.sourceTables || pipeline.sourceTables.length === 0) throw new Error("❌ Missing or empty tables in syncTask");

    if (!targetConnection) throw new Error("❌ Missing sourceConnection in syncTask");
  
  const serverId = await getNextSequence("serverId");
  const name = await generateConnectorNamesFromPipeline(pipelineId);
  
  return {
    name,
    pipeline,
    serverId,
  };

};
