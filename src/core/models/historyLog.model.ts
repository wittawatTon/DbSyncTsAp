import { Schema } from "mongoose";

export const historyLogSchema = new Schema({
  timestamp: { type: Date, default: Date.now },
  user: { type: String },
  action: { type: String, enum: ['create', 'update', 'delete'], required: true },
  diff: { type: Schema.Types.Mixed }
}, { _id: false });
