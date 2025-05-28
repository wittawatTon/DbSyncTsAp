import { Router, Request, Response } from 'express';
import * as syncTaskController from '@api/controllers/syncTaskController.js';

const router: Router = Router();

// Create a new sync task
router.post('/', (req: Request, res: Response) => {
  syncTaskController.create(req, res);
});

// Get all sync tasks
router.get('/', (req: Request, res: Response) => {
  syncTaskController.findAll(req, res);
});

// Get a sync task by ID
router.get('/:id', (req: Request, res: Response) => {
  syncTaskController.findOne(req, res);
});

// Start a sync task
router.post('/:taskId/start', (req: Request, res: Response) => {
  syncTaskController.start(req, res);
});

// Stop a sync task
router.post('/:taskId/stop', (req: Request, res: Response) => {
  syncTaskController.stop(req, res);
});

export default router;
