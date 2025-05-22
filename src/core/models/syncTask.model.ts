import mongoose, { Document, Schema, Model } from 'mongoose';
import TableSchema, { ITable } from './table.model';
import DbConnectionSchema, { IDbConnection } from './dbConnection.model';

// Sub-schema: Debezium connector config
export interface IDebeziumConnectorConfig {
  name: string; // Connector name
  config: Record<string, any>; // Full JSON config
}

const DebeziumConnectorConfigSchema = new Schema<IDebeziumConnectorConfig>(
  {
    name: { type: String, required: true },
    config: { type: Schema.Types.Mixed, required: true },
  },
  { _id: false }
);

export type ReplicationStatus = 'success' | 'warning' | 'error' | 'onProgress';

// Main SyncTask interface
export interface ISyncTask extends Document {
  name: string;
  status: ReplicationStatus;
  lastRunTime?: Date;
  sourceConnection: IDbConnection;
  targetConnection: IDbConnection;
  sourceConnectorConfig: IDebeziumConnectorConfig;
  sinkConnectorConfig: IDebeziumConnectorConfig;
  tables: ITable[];
  logs: string[];
  createdBy: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// Main SyncTask schema
const syncTaskSchema: Schema<ISyncTask> = new Schema<ISyncTask>(
  {
    name: { type: String, required: true },
    status: { 
      type: String, 
      enum: ['success', 'warning', 'error', 'onProgress'], 
      required: true,
      default: 'onProgress'
    },
    lastRunTime: { type: Date },
    sourceConnection: { type: DbConnectionSchema, required: true },
    targetConnection: { type: DbConnectionSchema, required: true },    
    sourceConnectorConfig: { type: DebeziumConnectorConfigSchema, required: true },
    sinkConnectorConfig: { type: DebeziumConnectorConfigSchema, required: true },
    tables: { type: [TableSchema], required: true, default: [] },
    logs: { type: [String], default: [] },
    createdBy: { type: String, required: true },
  },
  { timestamps: true }
);

// Create and export model
const SyncTask: Model<ISyncTask> = mongoose.model<ISyncTask>('SyncTask', syncTaskSchema);
export default SyncTask;
