import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import * as connectorController from '../controllers/connectorController.js';

// การตั้งค่า route สำหรับ monitor status
const router = Router();

router.post('/connectors', connectorController.createConnector);
router.delete('/connectors/:connectorName', connectorController.deleteConnector);
router.post('/connectors/:connectorName/start', connectorController.startConnector);
router.post('/connectors/:connectorName/stop', connectorController.stopConnector);

// เพิ่ม route สำหรับ monitor status
router.get('/connectors/:connectorName/status', connectorController.monitorConnectorStatus);

export default router;