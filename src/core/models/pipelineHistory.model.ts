// @core/models/pipelineHistory.model.ts

import mongoose, { Document, Schema, Model, Types } from "mongoose";

// Optional: Declare literal union type for action if needed elsewhere
export const PIPELINE_ACTIONS = ['create', 'update', 'delete'] as const;
export type PipelineAction = typeof PIPELINE_ACTIONS[number];

export interface PipelineHistoryDocument extends Document {
  _id: Types.ObjectId;
  timestamp: Date;
  user: string;
  action: PipelineAction;
  diff: any;
}

const pipelineHistorySchema = new Schema<PipelineHistoryDocument>({
  timestamp: { type: Date, default: Date.now },
  user: { type: String },
  action: { type: String, enum: PIPELINE_ACTIONS, required: true },
  diff: { type: Schema.Types.Mixed },
}, { timestamps: true });

export const PipelineHistoryModel: Model<PipelineHistoryDocument> =
  mongoose.model<PipelineHistoryDocument>("PipelineHistory", pipelineHistorySchema);
