import mongoose, { Document, Schema, Model } from 'mongoose';

// สร้าง interface สำหรับ Counter document
export interface ICounter extends Document {
  _id: string; // เช่น 'serverId', 'taskId'
  seq: number;
}

// สร้าง schema ด้วย type annotation
const counterSchema: Schema<ICounter> = new Schema<ICounter>({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 }
});

// สร้างและ export model
const Counter: Model<ICounter> = mongoose.model<ICounter>('Counter', counterSchema);
export default Counter;