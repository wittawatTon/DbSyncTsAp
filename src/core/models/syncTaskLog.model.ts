import mongoose, { Document, Schema, Model, Types } from 'mongoose';

// สร้าง interface สำหรับ SyncTaskLog document
export interface ISyncTaskLog extends Document {
  action: string; // เช่น 'create', 'update', 'delete'
  syncTaskId: Types.ObjectId;
  details?: string;
  createdBy: string;
  createdAt?: Date;
}

// สร้าง schema ด้วย type annotation
const SyncTaskLogSchema: Schema<ISyncTaskLog> = new Schema<ISyncTaskLog>({
  action: { type: String, required: true },
  syncTaskId: { type: Schema.Types.ObjectId, ref: 'SyncTask', required: true },
  details: { type: String },
  createdBy: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

// สร้างและ export model
const SyncTaskLog: Model<ISyncTaskLog> = mongoose.model<ISyncTaskLog>('SyncTaskLog', SyncTaskLogSchema);
export default SyncTaskLog;