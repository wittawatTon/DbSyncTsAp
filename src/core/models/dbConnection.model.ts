import mongoose, { Schema, Document, Types, Model } from "mongoose";

// ✅ 1. Enum for supported DB types
export const SUPPORTED_DB_TYPES = ['mysql', 'mssql', 'postgresql', 'oracle', 'db2i', 'db2luw'] as const;
export type DbType = typeof SUPPORTED_DB_TYPES[number];

// ✅ 2. Base config type
export interface IDbConnection {
  dbType: DbType;
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  ssl?: boolean;
  dbSchema?: string;
}

// ✅ 3. Document type for Mongoose
export interface ConnectionConfigDocument extends IDbConnection, Document {
  _id: Types.ObjectId;
}

// ✅ 4. Schema
const connectionConfigSchema = new Schema<ConnectionConfigDocument>({
  dbType: { type: String, enum: SUPPORTED_DB_TYPES, required: true },
  host: { type: String, required: true },
  port: { type: Number, required: true },
  username: { type: String, required: true },
  password: { type: String, required: true },
  database: { type: String, required: true },
  ssl: { type: Boolean, default: true },
  dbSchema: { type: String },
}, { timestamps: true });

// ✅ 5. Model
export const ConnectionConfigModel: Model<ConnectionConfigDocument> =
  mongoose.model<ConnectionConfigDocument>("ConnectionConfig", connectionConfigSchema);
