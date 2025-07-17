import { Router, Request, Response } from 'express';
import { PipelineController } from '@api/controllers/pipelineController.js';


const router: Router = Router();
const pipelineController = new PipelineController();



// Build a pipeline
router.post('/:id/actions/build', (req: Request, res: Response) => {
  pipelineController.build(req, res);
});

// Pause a pipeline
router.post('/:id/actions/pause', (req: Request, res: Response) => {
  pipelineController.pause(req, res);
});

// enableCDC a pipeline
router.post('/:id/actions/enable-cdc', (req: Request, res: Response) => {
  pipelineController.enableCDC(req, res);
});


// Create a new pipeline
router.post('/', (req: Request, res: Response) => {
  pipelineController.create(req, res);
});


// Get a pipeline by ID with populated references
router.get('/:id/with-populate', (req: Request, res: Response) => {
  pipelineController.findByIdWithPopulate(req, res);
});

// Get a pipeline by ID
router.get('/:id', (req: Request, res: Response) => {
  pipelineController.findById(req, res);
});

// Get all pipelines
router.get('/', (req: Request, res: Response) => {
  pipelineController.findAllWithPopulate(req, res);
});


// Update a pipeline
router.put('/:id', (req: Request, res: Response) => {
  pipelineController.updateById(req, res);
});


// Update a pipeline setting
router.put('/:id/settings', (req: Request, res: Response) => {
  pipelineController.updateSettingsById(req, res);
});


// Update a specific field of a pipeline
router.patch('/:id/field', (req: Request, res: Response) => {
  pipelineController.updateFieldById(req, res);
});


// Toggle pipeline status
router.patch('/:id/status', (req: Request, res: Response) => {
  pipelineController.toggleStatus(req, res);
});

// Delete a pipeline
router.delete('/:id', (req: Request, res: Response) => {
  pipelineController.deleteByIdMarked(req, res);
});



export default router;