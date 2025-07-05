import { IDebeziumConnectorConfig } from "@core/models/type.js";
import { createSourceConnectJson } from "./debezium/source/createSourceConnectJson.js"
import { createSinkConnectJson } from "./debezium/sink/createSinkConnectJson.js"



type ConnectorType = 'source' | 'sink';


/**
 * สร้าง Debezium connector config โดยแยกตามประเภท ConnectorType
 * @param pipelineId - ID ของ pipeline
 * @param connType - 'source' หรือ 'target'
 */
export const createDebeziumConnectorConfig = async (
  pipelineId: string,
  connType: ConnectorType
): Promise<IDebeziumConnectorConfig> => {
  switch (connType) {
    case "source":
        return await createSourceConnectJson(pipelineId);
    case "sink":
        return await createSinkConnectJson(pipelineId); 
    default:
      throw new Error(`❌ Unsupported connector type: ${connType}`);
  }
};
