import { SyncTask } from '@/types';
import { promises as fs } from 'fs';
import path from 'path';


export async function getMockSyncTask(): Promise<SyncTask[]> {
  try {
    const filePath = path.resolve(process.cwd(), 'src/data/mock_replicator_synctasks.json');
    const data = await fs.readFile(filePath, 'utf8');
    const syncTasks: SyncTask[] = JSON.parse(data);
    return syncTasks;
  } catch (err) {
    console.error('Failed to load syncTasks:', err);
    return [];
  }
}