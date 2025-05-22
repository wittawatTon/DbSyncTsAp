import mongoose, { Schema, Document, Types, Model } from "mongoose";
import { historyLogSchema } from "./historyLog.model";
import { ConnectionConfigDocument } from "@core/models/connectionConfig.model";
import { TableDocument } from "@core/models/tableWithMap.model";
import { PipelineHistory } from "@core/models/type";

// Generic base document type with _id, createdAt, updatedAt
type MongoDoc<T> = T & Document & {
  _id: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
};

export type PipelineDocument = MongoDoc<{
  name: string;
  description?: string;
  status: 'active' | 'paused' | 'stopped';

  sourceDbConnection: Types.ObjectId;   // ref to ConnectionConfig
  targetDbConnection: Types.ObjectId;   // ref to ConnectionConfig

  sourceTables: Types.ObjectId[];       // ref to Table[]
  targetTables: Types.ObjectId[];       // ref to Table[]

  historyLogs: Types.ObjectId[];        // ref to PipelineHistory[]

  lastRunAt?: Date;
  lastSuccessRunAt?: Date;

  lastErrorMessage?: string;
  errorLogs: string[];

  schedule?: string;
  ownerUserId: string;
}>;

const pipelineSchema = new Schema<PipelineDocument>({
  name: { type: String, required: true },
  description: { type: String },

  status: { type: String, enum: ['active', 'paused', 'stopped'], default: 'paused' },

  sourceDbConnection: { type: Schema.Types.ObjectId, ref: 'ConnectionConfig', required: true },
  targetDbConnection: { type: Schema.Types.ObjectId, ref: 'ConnectionConfig', required: true },

  sourceTables: [{ type: Schema.Types.ObjectId, ref: 'Table', default: [] }],
  targetTables: [{ type: Schema.Types.ObjectId, ref: 'Table', default: [] }],

  historyLogs: [{ type: Schema.Types.ObjectId, ref: 'PipelineHistory', default: [] }],

  lastRunAt: { type: Date },
  lastSuccessRunAt: { type: Date },

  lastErrorMessage: { type: String },
  errorLogs: { type: [String], default: [] },

  schedule: { type: String },
  ownerUserId: { type: String, required: true }
}, {
  timestamps: true
});

export const PipelineModel: Model<PipelineDocument> = mongoose.model<PipelineDocument>("Pipeline", pipelineSchema);
