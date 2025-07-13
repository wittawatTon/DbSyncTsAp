import { IDbConnection } from '@core/models/dbConnection.model.js';

export interface Pipeline extends Document {
  name: string;
  description?: string;
  status: 'draft' | 'active' | 'paused' | 'stopped' | 'error' | 'deleted';

  sourceDbConnection: IDbConnection;
  targetDbConnection: IDbConnection;

  sourceTables: Table[];
  targetTables: Table[];

  historyLogs: PipelineHistory[];

  lastRunAt?: Date;
  lastSuccessRunAt?: Date;

  lastErrorMessage?: string;
  errorLogs: string[];

  schedule?: string;
  ownerUserId: string;

  createdAt: Date;
  updatedAt: Date;
}


export interface ColumnMapping {
  sourceColumn: string;
  targetColumn: string;
}

export interface Column {
  id: string;
  name: string;
  dataType: string;
  isPrimaryKey: boolean;
  isSelected: boolean;
  isNullable: boolean;
}

export interface Table {
  name: string;
  sourceTableName?: string;
  isDropped: boolean;
  columnMappings: ColumnMapping[];
  columns: Column[];
}

export interface PipelineHistory {
  timestamp: Date;
  user?: string;
  action: 'create' | 'update' | 'delete';
  diff: any;
}

export interface IDebeziumConnectorConfig {
  name: string; // Connector name
  config: Record<string, any>; // Full JSON config
}


// models/PipelineConfig.ts

export type PipelineMode = "snapshot" | "schedule" | "cdc";
export type InsertMode = "insert" | "upsert";
export type ConflictHandling = "skip" | "stop" | "log";
export type InitialLoadStrategy = "snapshot_then_cdc" | "log_only";

export interface TransformationRule {
  id: string;
  sourceField: string;
  transformation: string;
}

export interface NotificationSettings {
  email: boolean;
  lineNotify: boolean;
  webhook: boolean;
}

export interface PipelineSettingModel {
  name: string;
  mode: PipelineMode;
  schedulePreset?: string;      // optional, used only in schedule mode
  customCron?: string;          // optional, used only in schedule mode
  insertMode: InsertMode;
  primaryKeys?: string[];       // optional, used in upsert mode
  conflictHandling: ConflictHandling;
  transformationRules: TransformationRule[];
  initialLoadStrategy?: InitialLoadStrategy; // optional, used in CDC
  notifications: NotificationSettings;
  enableValidation: boolean;
  batchSize: number;
  commitInterval: number;
  parallelism: number;
}
