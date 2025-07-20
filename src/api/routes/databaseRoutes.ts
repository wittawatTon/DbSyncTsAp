import { Router } from 'express';
import { DatabaseController } from '@controllers/databaseController.js';

const router: Router = Router();
const databaseController = new DatabaseController();

router.post('/get-tables', databaseController.fetchTables);
router.post('/create-table', databaseController.createTableHandler);
router.post('/test-connection', databaseController.testConnect);
router.post('/data-diff-count-row', databaseController.dataDiffcountRow);


export default router;
