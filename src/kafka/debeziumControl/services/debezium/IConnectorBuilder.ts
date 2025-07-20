import { IDebeziumConnectorConfig } from "@core/models/type.js";
import { PipelineWithConnections } from "@core/models/pipeline.model.js";
import { ConnectorType } from "@core/models/type.js";
import { ConnectorNamePair } from "@kafka/debeziumControl/services/pipelineService.js";


export interface IConnectorBuilder {
  name: string; 
  type: ConnectorType; 
  build(
    connectorBuildData: IConnectorBuildData
  ): IDebeziumConnectorConfig;
}

export interface IConnectorBuildData {
    name: ConnectorNamePair | null,
    pipeline: PipelineWithConnections,
    serverId: number
}
