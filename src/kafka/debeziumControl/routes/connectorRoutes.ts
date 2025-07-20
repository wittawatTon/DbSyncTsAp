import { Router } from 'express';
import * as connectorController from '../controllers/connectorController.js';

// การตั้งค่า route สำหรับ monitor status
const router = Router();

router.post('/', connectorController.createConnector);

// แก้ไข: ย้าย route ที่เฉพาะเจาะจงกว่าขึ้นมาก่อน เพื่อป้องกันการชนกับ route ที่มี parameter
router.delete('/pipeline/:pipelineId', connectorController.deleteConnectorByPipeline);

router.delete('/:connectorName', connectorController.deleteConnector);
router.post('/:connectorName/resume', connectorController.resumeConnector);
router.post('/:connectorName/pause', connectorController.pauseConnector);

// เพิ่ม route สำหรับ monitor status
router.get('/:connectorName/status', connectorController.ConnectorStatus);

export default router;