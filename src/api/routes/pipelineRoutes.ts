import { Router, Request, Response } from 'express';
import { PipelineController } from '@core/controllers/pipelineController.js';
import {
  getAllConnectionConfigs,
  getConnectionConfigById,
  createConnectionConfig,
  createIfNotExist,
  updateConnectionConfigById,
  deleteConnectionConfigById
} from '@core/controllers/connectionConfigController.js';

const router: Router = Router();
const pipelineController = new PipelineController();


// 🔧 ConnectionConfig CRUD routes
router.get('/connection-configs', getAllConnectionConfigs);
router.get('/connection-configs/:id', getConnectionConfigById);
router.post('/connection-configs', createIfNotExist);
router.put('/connection-configs/:id', updateConnectionConfigById);
router.delete('/connection-configs/:id', deleteConnectionConfigById);



// Create a new pipeline
router.post('/', (req: Request, res: Response) => {
  pipelineController.create(req, res);
});

// Get all pipelines
router.get('/', (req: Request, res: Response) => {
  pipelineController.findAll(req, res);
});

// Get all pipelines with populated references
router.get('/with-populate', (req: Request, res: Response) => {
  pipelineController.findAllWithPopulate(req, res);
});

// Get a pipeline by ID
router.get('/:id', (req: Request, res: Response) => {
  pipelineController.findById(req, res);
});

// Get a pipeline by ID with populated references
router.get('/:id/with-populate', (req: Request, res: Response) => {
  pipelineController.findByIdWithPopulate(req, res);
});

// Update a pipeline
router.put('/:id', (req: Request, res: Response) => {
  pipelineController.updateById(req, res);
});

// Update a specific field of a pipeline
router.patch('/:id/field', (req: Request, res: Response) => {
  pipelineController.updateFieldById(req, res);
});

// Delete a pipeline
router.delete('/:id', (req: Request, res: Response) => {
  pipelineController.deleteById(req, res);
});



export default router;