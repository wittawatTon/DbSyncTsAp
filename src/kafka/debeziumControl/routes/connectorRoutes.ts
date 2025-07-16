import { Router } from 'express';
import * as connectorController from '../controllers/connectorController.js';

// การตั้งค่า route สำหรับ monitor status
const router = Router();

router.post('/connectors', connectorController.createConnector);
router.delete('/connectors/:connectorName', connectorController.deleteConnector);
router.post('/connectors/:connectorName/resume', connectorController.resumeConnector);
router.post('/connectors/:connectorName/pause', connectorController.pauseConnector);


// เพิ่ม route สำหรับ monitor status
router.get('/connectors/:connectorName/status', connectorController.ConnectorStatus);

export default router;