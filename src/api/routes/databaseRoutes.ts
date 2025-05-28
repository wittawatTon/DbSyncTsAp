import { Router, Request, Response, NextFunction } from 'express';
import { fetchTablesHandler,testConnectHandler } from '@controllers/databaseController';


const router: Router = Router();

// หาก fetchTablesHandler มี type ที่แน่นอน สามารถระบุ type ได้ เช่น (req: Request, res: Response, next: NextFunction)
router.post('/get-tables', (req: Request, res: Response) => {
  fetchTablesHandler(req, res);
});

router.post('/test-connection', testConnectHandler);



export default router;