import { Router, Request, Response, NextFunction } from 'express';
import { dashboard } from '@api/controllers/syncTaskController';

const router: Router = Router();

// Get dashboard stats
router.get('/', (req: Request, res: Response) => {
  dashboard(req, res);
});

export default router;