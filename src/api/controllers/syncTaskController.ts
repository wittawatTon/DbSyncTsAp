import { Request, Response, NextFunction } from 'express';
import {
  getSyncTaskById,
  updateSyncTask,
  deleteSyncTask,
} from '@core/services/syncTaskService';
import {
  createSyncTaskApi,
  getSyncTasksApi,
  startTaskById,
  stopTaskById,
  getSyncTasksDashboardApi,
} from '@api/services/syncTaskServiceApi';
import { ISyncTask } from '@core/models/syncTask.model';
import { ISyncTaskApi } from '@api/models/syncTasksApi';
/**
 * POST /api/sync-tasks
 */
export const create = async (req: Request, res: Response): Promise<void> => {
  try {
    const syncTask: ISyncTaskApi = await createSyncTaskApi(req.body);
    res.status(201).json(syncTask);
  } catch (err) {
    console.error('Error creating SyncTask:', err);
    res.status(500).json({ error: 'Failed to create SyncTask' });
  }
};

/**
 * GET /api/sync-tasks
 */
export const findAll = async (req: Request, res: Response): Promise<void> => {
  try {
    const tasks: ISyncTaskApi[] = await getSyncTasksApi();
    res.status(200).json(tasks);
  } catch (err) {
    console.error('Error fetching SyncTasks:', err);
    res.status(500).json({ error: 'Failed to get SyncTasks' });
  }
};

/**
 * GET /api/sync-tasks/:id
 */
export const findOne = async (req: Request, res: Response): Promise<void> => {
  try {
    const task: ISyncTaskApi | null = await getSyncTaskById(req.params.id);
    if (!task) {
      res.status(404).json({ error: 'SyncTask not found' });
      return;
    }
    res.status(200).json(task);
  } catch (err) {
    console.error('Error fetching SyncTask:', err);
    res.status(500).json({ error: 'Failed to get SyncTask' });
  }
};

/**
 * PUT /api/sync-tasks/:id
 */
export const update = async (req: Request, res: Response): Promise<void> => {
  try {
    const updated: ISyncTask | null = await updateSyncTask(req.params.id, req.body);
    if (!updated) {
      res.status(404).json({ error: 'SyncTask not found' });
      return;
    }
    res.status(200).json(updated);
  } catch (err) {
    console.error('Error updating SyncTask:', err);
    res.status(500).json({ error: 'Failed to update SyncTask' });
  }
};

/**
 * DELETE /api/sync-tasks/:id
 */
export const remove = async (req: Request, res: Response): Promise<void> => {
  try {
    const deleted: ISyncTask | null = await deleteSyncTask(req.params.id);
    if (!deleted) {
      res.status(404).json({ error: 'SyncTask not found' });
      return;
    }
    res.status(200).json(deleted);
  } catch (err) {
    console.error('Error deleting SyncTask:', err);
    res.status(500).json({ error: 'Failed to delete SyncTask' });
  }
};

/**
 * POST /api/sync-tasks/:taskId/start
 */
export const start = async (req: Request, res: Response): Promise<void> => {
  try {
    const { taskId } = req.params;
    const taskStarted: boolean = await startTaskById(taskId);
    if (taskStarted) {
      res.status(200).json({ message: 'Task started successfully' });
    } else {
      res.status(400).json({ message: 'Failed to start task' });
    }
  } catch (error: any) {
    res.status(500).json({ message: `Error starting task: ${error.message}` });
  }
};

/**
 * POST /api/sync-tasks/:taskId/stop
 */
export const stop = async (req: Request, res: Response): Promise<void> => {
  try {
    const { taskId } = req.params;
    const taskStopped: boolean = await stopTaskById(taskId);
    if (taskStopped) {
      res.status(200).json({ message: 'Task stopped successfully' });
    } else {
      res.status(400).json({ message: 'Failed to stopping task' });
    }
  } catch (error: any) {
    res.status(500).json({ message: `Error stopping task: ${error.message}` });
  }
};

/**
 * GET /api/sync-tasks/dashboard
 */
export const dashboard = async (req: Request, res: Response): Promise<void> => {
  try {
    const stats = await getSyncTasksDashboardApi();
    res.status(200).json(stats);
  } catch (error) {
    console.error('Error generating dashboard stats:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
};

export default {
  create,
  findAll,
  findOne,
  update,
  remove,
  start,
  stop,
  dashboard,
};