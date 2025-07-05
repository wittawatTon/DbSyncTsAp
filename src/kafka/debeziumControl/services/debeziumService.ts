import axios, { AxiosResponse } from 'axios';
import dotenv from 'dotenv';
dotenv.config();  // ถ้าเรียกซ้ำก็ไม่เป็นไร มันจะโหลดแค่ครั้งเดียว


const CONNECT_URL: string = process.env.DEBEZIUM_CONNECT_URL || 'http://localhost:8083';

/**
 * สร้าง Kafka Connector
 * @param connectorConfig - กำหนดค่าของ connector (ควรเป็น object ตาม Kafka Connect API)
 */
export const createConnector = async (
  connectorConfig: object
): Promise<any> => {
  const response: AxiosResponse = await axios.post(
    `${CONNECT_URL}/connectors`,
    connectorConfig,
    {
      headers: { 'Content-Type': 'application/json' },
    }
  );
  return response.data;
};

/**
 * ลบ Kafka Connector
 * @param connectorName - ชื่อ connector
 */
export const deleteConnector = async (
  connectorName: string
): Promise<any> => {
  const response: AxiosResponse = await axios.delete(
    `${CONNECT_URL}/connectors/${encodeURIComponent(connectorName)}`
  );
  return response.data;
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
): Promise<any> => {
  const response: AxiosResponse = await axios.get(
    `${CONNECT_URL}/connectors/${encodeURIComponent(connectorName)}/status`
  );
  return response.data;
};