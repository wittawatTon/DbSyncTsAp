import axios, { AxiosResponse } from 'axios';
import dotenv from 'dotenv';
dotenv.config();  // ถ้าเรียกซ้ำก็ไม่เป็นไร มันจะโหลดแค่ครั้งเดียว
import { ConnectorType, DebeziumStatus  } from "@app/core/models/type.js";
import { PipelineService  } from "@core/services/pipeline.service.js";
import { generateConnectorNamesFromPipeline } from "@kafka/debeziumControl/services/pipelineService.js";



const CONNECT_URL: string = process.env.DEBEZIUM_CONNECT_URL || 'http://localhost:8083';



/**
 * สร้าง Kafka Connector
 * @param connectorConfig - config สำหรับ connector
 */
export const createConnector = async (
  connectorConfig: object
): Promise<any> => {
  try {
    const response: AxiosResponse = await axios.post(
      `${CONNECT_URL}/connectors`,
      connectorConfig,
      {
        headers: { "Content-Type": "application/json" },
      }
    );
    return response.data;
  } catch (error) {
    console.error("❌ Failed to create connector:", error);
    throw error;
  }
};

/**
 * ลบ Kafka Connector
 * @param connectorName - ชื่อ connector
 */
export const deleteConnector = async (
  connectorName: string
): Promise<any> => {
  try {
    const response: AxiosResponse = await axios.delete(
      `${CONNECT_URL}/connectors/${encodeURIComponent(connectorName)}`
    );
    return response.data;
  } catch (error) {
    console.error(`❌ Failed to delete connector "${connectorName}":`, error);
    throw error;
  }
};


export const deleteConnectorByPipeline = async (
  pipelineId: string,
  type: ConnectorType
): Promise<any> => {
    try {
    const connectorObj = await generateConnectorNamesFromPipeline(pipelineId);
    const connectorName = type === "source" ? connectorObj?.source : connectorObj?.sink;    
    if (!connectorName) {
      throw new Error(`Could not determine connector name for pipeline ${pipelineId} and type ${type}.`);
    }

    return await deleteConnector(connectorName);
  } catch (error: any) {
    console.error(`❌ Failed to delete connector for pipeline ${pipelineId}:`, error.message || error);
    throw new Error(`❌ Failed to delete connector for pipeline ${pipelineId}: ${error.message || error}`);
  }
};


/**
 * Resume Kafka Connector
 * @param connectorName - ชื่อ connector
 */
export const resumeConnector = async (
  connectorName: string
): Promise<any> => {
  try {
    const response: AxiosResponse = await axios.put(
      `${CONNECT_URL}/connectors/${encodeURIComponent(connectorName)}/resume`,
      {},
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
    return response.data;
  } catch (error: any) {
    throw new Error(
      `Failed to resume connector ${connectorName}: ${
        error.response?.data?.message || error.message
      }`
    );
  }
};

/**
 * Pause Kafka Connector
 * @param connectorName - ชื่อ connector
 */
export const pauseConnector = async (
  connectorName: string
): Promise<any> => {
  try {
    const response: AxiosResponse = await axios.put(
      `${CONNECT_URL}/connectors/${encodeURIComponent(connectorName)}/pause`,
      {},
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
    return response.data;
  } catch (error: any) {
    throw new Error(
      `Failed to pause connector ${connectorName}: ${
        error.response?.data?.message || error.message
      }`
    );
  }
};

/**
 * ตรวจสอบสถานะของ Kafka Connector
 * @param connectorName - ชื่อ connector
 */
export const getConnectorStatus = async (
  connectorName: string
): Promise<any | null> => {
  try {
    const response: AxiosResponse = await axios.get(
      `${CONNECT_URL}/connectors/${encodeURIComponent(connectorName)}/status`
    );
    return response.data;
  } catch (error: any) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      console.warn(`Connector not found: ${connectorName}`);
      return null;
    }
    throw error; // โยน error อื่นๆ ตามปกติ
  }
};


// ===== 🔍 สร้าง summary_status จาก connector/task state =====
export function getSummaryStatus(status: any): DebeziumStatus {
  const connectorState = status?.connector?.state || "UNKNOWN";
  const taskStates = (status?.tasks || []).map(t => t.state);

  if (connectorState === "FAILED") return "FAILED";
  if (connectorState === "PAUSED") return "PAUSED";
  if (connectorState === "UNKNOWN") return "UNDEFINED";
  if (connectorState === "UNASSIGNED") return "UNASSIGNED";

  if (connectorState === "RUNNING") {
    if (taskStates.every(s => s === "RUNNING")) return "RUNNING";
    if (taskStates.some(s => s === "FAILED")) return "PARTIALLY_FAILED";
    return "RUNNING_WITH_WARNINGS";
  }
  return connectorState as DebeziumStatus;
}
