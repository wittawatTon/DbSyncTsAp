import { Request, Response } from 'express';
import { ConnectionConfigService } from '@core/services/connectionConfig.service.js';
import { ConnectionConfigModel } from '@core/models/connectionConfig.model.js';

// Create a singleton instance of the service to reuse in all handlers
const connectionConfigService = new ConnectionConfigService(ConnectionConfigModel);

// --- CRUD Handlers ---

export const getAllConnectionConfigs = async (_req: Request, res: Response): Promise<void> => {
  try {
    const configs = await connectionConfigService.findAll();
    res.json(configs);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch connection configs', message: err.message });
  }
};

export const getConnectionConfigById = async (req: Request, res: Response): Promise<void> => {
  try {
    const config = await connectionConfigService.findById(req.params.id);
    if (!config) {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    res.json(config);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch connection config', message: err.message });
  }
};

export const createConnectionConfig = async (req: Request, res: Response): Promise<void> => {
  try {
    const created = await connectionConfigService.create(req.body);
    res.status(201).json(created);
  } catch (err: any) {
    res.status(400).json({ error: 'Failed to create connection config', message: err.message });
  }
};

export const updateConnectionConfigById = async (req: Request, res: Response): Promise<void> => {
  try {
    const updated = await connectionConfigService.updateById(req.params.id, req.body);
    if (!updated) {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: 'Failed to update connection config', message: err.message });
  }
};

export const deleteConnectionConfigById = async (req: Request, res: Response): Promise<void> => {
  try {
    const deleted = await connectionConfigService.deleteById(req.params.id);
    if (!deleted) {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    res.json({ message: 'Deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete connection config', message: err.message });
  }
}



export const createIfNotExist  = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await connectionConfigService.createIfNotExist(req.body);
    if (!result) {
      res.status(409).json({ message: 'Duplicate connection config found. Not created.' });
      return;
    }
    res.json({ message: 'Deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete connection config', message: err.message });
  }



};