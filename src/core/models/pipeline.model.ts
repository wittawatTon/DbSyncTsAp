import mongoose, { Schema, Document, Types, Model } from "mongoose";
import "@core/models/pipelineHistory.model.js"; 
import "@core/models/connectionConfig.model.js";
import { TableDocument, tableSchema } from "@core/models/tableWithMap.model.js";


// Generic base document type with _id, createdAt, updatedAt
type MongoDoc<T> = T & Document & {
  _id: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
};

/**
 * Defines the structure of a Pipeline document in the database.
 */
export type PipelineDocument = MongoDoc<{
  name: string;
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
}>;

/**
 * Mongoose schema for the Pipeline document.
 */
const pipelineSchema = new Schema<PipelineDocument>({
  name: { type: String, required: true },
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
  ownerUserId: { type: String, required: true }
}, {
  timestamps: true
});

/**
 * Mongoose model for the Pipeline document.
 */
export const PipelineModel: Model<PipelineDocument> = mongoose.model<PipelineDocument>("Pipeline", pipelineSchema);
