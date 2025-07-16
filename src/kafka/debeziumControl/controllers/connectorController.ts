import type { Request, Response, NextFunction } from 'express';
import * as debeziumService from '../services/debeziumService.js';

/**
 * สร้าง Kafka Connector
 */
export const createConnector = async (req: Request, res: Response): Promise<void> => {
  try {
    const connectorConfig = req.body;
    const result = await debeziumService.createConnector(connectorConfig);
    res.status(201).json(result);
  } catch (error: any) {
    res.status(500).json({ message: 'Error creating connector', error: error.message });
  }
};

/**
 * ลบ Kafka Connector
 */
export const deleteConnector = async (req: Request, res: Response): Promise<void> => {
  try {
    const { connectorName } = req.params;
    const result = await debeziumService.deleteConnector(connectorName);
    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({ message: 'Error deleting connector', error: error.message });
  }
};

/**
 * Start Kafka Connector
 */
export const resumeConnector = async (req: Request, res: Response): Promise<void> => {
  try {
    const { connectorName } = req.params;
    const result = await debeziumService.resumeConnector(connectorName);
    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({ message: 'Error resume connector', error: error.message });
  }
};

/**
 * Stop Kafka Connector
 */
export const pauseConnector = async (req: Request, res: Response): Promise<void> => {
  try {
    const { connectorName } = req.params;
    const result = await debeziumService.pauseConnector(connectorName);
    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({ message: 'Error pause connector', error: error.message });
  }
};

/**
 * ตรวจสอบสถานะของ Connector
 */
export const ConnectorStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { connectorName } = req.params;
    const status = await debeziumService.getConnectorStatus(connectorName);
    res.status(200).json(status);
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching connector status', error: error.message });
  }
};