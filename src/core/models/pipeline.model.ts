import mongoose, { Schema, Document, Types, Model } from "mongoose";
import { TableDocument, tableSchema } from "@core/models/tableWithMap.model.js";
import { PipelineSettingModel } from "@core/models/type.js"
import { ConnectionConfigDocument } from "@core/models/dbConnection.model.js"


// Generic base document type with _id, createdAt, updatedAt
type MongoDoc<T> = T & Document & {
  _id: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
};

// ประกาศชนิดที่ populate แล้ว
export type PipelineWithConnections = Omit<
  PipelineDocument,
  "sourceDbConnection" | "targetDbConnection"
> & {
  sourceDbConnection: ConnectionConfigDocument;
  targetDbConnection: ConnectionConfigDocument;
};

const pipelineSettingSchema = new Schema<PipelineSettingModel>({
  name: { type: String, required: true },
  mode: { type: String, enum: ["snapshot", "schedule", "cdc"], required: true },
  schedulePreset: { type: String },
  customCron: { type: String },
  insertMode: { type: String, enum: ["insert", "upsert"], required: true },
  primaryKeys: { type: [String] },
  conflictHandling: { type: String, enum: ["skip", "stop", "log"], required: true },
  transformationRules: [{
    id: { type: String, required: true },
    sourceField: { type: String, required: true },
    transformation: { type: String, required: true }
  }],
  initialLoadStrategy: { type: String, enum: ["snapshot_then_cdc", "log_only"] },
  notifications: {
    email: { type: Boolean, default: false },
    lineNotify: { type: Boolean, default: false },
    webhook: { type: Boolean, default: false }
  },
  enableValidation: { type: Boolean, default: false },
  batchSize: { type: Number, default: 1000 },
  commitInterval: { type: Number, default: 10 },
  parallelism: { type: Number, default: 1 }
}, { _id: false });

/**
 * Defines the structure of a Pipeline document in the database.
 */
export type PipelineDocument = MongoDoc<{
  name?: string;
  description?: string;
  status: 'draft' | 'active' | 'paused' | 'stopped' | 'error' |'deleted';

  sourceDbConnection: Types.ObjectId;   // ref to ConnectionConfig
  targetDbConnection: Types.ObjectId;   // ref to ConnectionConfig

  sourceTables: TableDocument[];        // embedded TableDocument objects
  targetTables: TableDocument[];        // embedded TableDocument objects

  historyLogs: Types.ObjectId[];        // ref to PipelineHistory[]

  lastRunAt?: Date;
  lastSuccessRunAt?: Date;

  lastErrorMessage?: string;
  errorLogs: string[];

  schedule?: string;
  ownerUserId: string;

  settings: PipelineSettingModel;
}>;

/**
 * Mongoose schema for the Pipeline document.
 */
const pipelineSchema = new Schema<PipelineDocument>({
  description: { type: String },

  status: { type: String, enum: ['draft', 'active', 'paused', 'stopped', 'error', 'deleted'], default: 'draft' },

  sourceDbConnection: { type: Schema.Types.ObjectId, ref: 'ConnectionConfig', required: true },
  targetDbConnection: { type: Schema.Types.ObjectId, ref: 'ConnectionConfig', required: true },

  sourceTables: [tableSchema],
  targetTables: [tableSchema],

  historyLogs: [{ type: Schema.Types.ObjectId, ref: 'PipelineHistory', default: [] }],

  lastRunAt: { type: Date },
  lastSuccessRunAt: { type: Date },

  lastErrorMessage: { type: String },
  errorLogs: { type: [String], default: [] },

  schedule: { type: String },
  ownerUserId: { type: String, required: true },

  settings: { type: pipelineSettingSchema, required: false }
}, {
  timestamps: true
});

/**
 * Mongoose model for the Pipeline document.
 */
export const PipelineModel: Model<PipelineDocument> = mongoose.model<PipelineDocument>("Pipeline", pipelineSchema);
