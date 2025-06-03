export interface Pipeline extends Document {
  name: string;
  description?: string;
  status: 'draft' | 'active' | 'paused' | 'stopped' | 'error' | 'deleted';

  sourceDbConnection: ConnectionConfig;
  targetDbConnection: ConnectionConfig;

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


export interface ConnectionConfig {
dbType: 'mysql' | 'mssql' | 'postgresql' | 'oracle' | 'db2i' | 'db2luw';
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  ssl: boolean;
  dbSchema?: string;
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
