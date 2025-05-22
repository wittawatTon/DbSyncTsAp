import { Schema } from 'mongoose';

/**
 * TypeScript interface for a database connection configuration.
 */

// Type Definitions
export type DbType = 'mysql' | 'mssql' | 'postgresql' | 'oracle' | 'db2';

export interface IDbConnection {
  dbType: DbType;
  host: string;
  port: number;
  username: string;
  database: string;
  password: string;
  ssl?: boolean;
}

/**
 * Mongoose schema for a database connection configuration.
 */
export const IDbConnectionSchema = new Schema<IDbConnection>(
  {
    dbType: { type: String, enum: ['mysql', 'mssql', 'postgresql', 'oracle', 'db2'], required: true },
    host: { type: String, required: true },
    port: { type: Number, required: true },
    username: { type: String, required: true },
    database: { type: String, required: true },
    password: { type: String, required: true },
  },
  { _id: false }
);

export default IDbConnectionSchema;