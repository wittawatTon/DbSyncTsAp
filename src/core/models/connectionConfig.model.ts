import mongoose, { Document, Schema, Model, Types } from "mongoose";
import { ConnectionConfig } from "@core/models/type";
export const SUPPORTED_DB_TYPES = ['mysql', 'mssql', 'postgresql', 'oracle', 'db2i', 'db2luw'] as const;
export type SupportedDbType = typeof SUPPORTED_DB_TYPES[number];

export interface ConnectionConfigDocument extends ConnectionConfig, Document {
  _id: Types.ObjectId;
}

const connectionConfigSchema = new Schema<ConnectionConfigDocument>({
  dbType: { type: String, enum: SUPPORTED_DB_TYPES, required: true },
  host: { type: String, required: true },
  port: { type: Number, required: true },
  username: { type: String, required: true },
  password: { type: String, required: true },
  database: { type: String, required: true },
  ssl: { type: Boolean, default: true },
  dbSchema: { type: String }
}, { timestamps: true });

export const ConnectionConfigModel: Model<ConnectionConfigDocument> =
  mongoose.model<ConnectionConfigDocument>("ConnectionConfig", connectionConfigSchema);
