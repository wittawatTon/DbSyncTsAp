import { Router, Request, Response } from 'express';
import {
  getAllConnectionConfigs,
  getConnectionConfigById,
  createIfNotExist,
  updateConnectionConfigById,
  deleteConnectionConfigById,
} from '@core/controllers/connectionConfigController.js';

const router: Router = Router();


// 🔧 ConnectionConfig CRUD routes
router.get('/', getAllConnectionConfigs);
router.get('/:id', getConnectionConfigById);
router.post('/', createIfNotExist);
router.put('/:id', updateConnectionConfigById);
router.delete('/:id', deleteConnectionConfigById);

export default router;