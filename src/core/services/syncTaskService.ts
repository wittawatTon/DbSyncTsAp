import SyncTask, { ISyncTask } from '@core/models/syncTask.model.js';
import SyncTaskLog, { ISyncTaskLog } from '@core/models/syncTaskLog.model.js';
import { Types } from 'mongoose';

/**
 * สร้าง SyncTask ใหม่และบันทึก log
 */
export const createSyncTask = async (syncTaskData: Partial<ISyncTask>): Promise<ISyncTask> => {
  const now = new Date();

  const syncTask = new SyncTask({
    ...syncTaskData,
    createdAt: now,
    updatedAt: now,
    createdBy: "TODO", // TODO: get user id from auth
  });

  await syncTask.save();

  const log = new SyncTaskLog({
    action: 'create',
    syncTaskId: syncTask._id,
    details: `Created SyncTask with name ${syncTask.name}`,
    createdBy: "TODO", // TODO: get user id from auth
    createdAt: now,
  });

  await log.save();

  return syncTask;
};

/**
 * ดึง SyncTask ทั้งหมด
 */
export const getSyncTasks = async (): Promise<ISyncTask[]> => {
  return await SyncTask.find();
};

/**
 * ดึง SyncTask ตาม id
 */
export const getSyncTaskById = async (id: string | Types.ObjectId): Promise<ISyncTask | null> => {
  return await SyncTask.findById(id);
};

/**
 * อัปเดต SyncTask ตาม id และบ��นทึก log
 */
export const updateSyncTask = async (
  id: string | Types.ObjectId,
  syncTaskData: Partial<ISyncTask>
): Promise<ISyncTask | null> => {
  const updatedSyncTask = await SyncTask.findByIdAndUpdate(id, syncTaskData, { new: true });

  if (updatedSyncTask) {
    const log = new SyncTaskLog({
      action: 'update',
      syncTaskId: updatedSyncTask._id,
      details: `Updated SyncTask with name ${updatedSyncTask.name}`,
      createdBy: syncTaskData.createdBy ?? "TODO",
    });
    await log.save();
  }

  return updatedSyncTask;
};

/**
 * ลบ SyncTask ตาม id และบันทึก log
 */
export const deleteSyncTask = async (id: string | Types.ObjectId): Promise<ISyncTask | null> => {
  const deletedSyncTask = await SyncTask.findByIdAndDelete(id);

  if (deletedSyncTask) {
    const log = new SyncTaskLog({
      action: 'delete',
      syncTaskId: deletedSyncTask._id,
      details: `Deleted SyncTask with name ${deletedSyncTask.name}`,
      createdBy: deletedSyncTask.createdBy ?? "TODO",
    });
    await log.save();
  }

  return deletedSyncTask;
};