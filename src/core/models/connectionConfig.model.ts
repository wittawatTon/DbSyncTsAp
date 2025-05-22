import mongoose, { Document, Schema, Model, Types } from "mongoose";
import { ConnectionConfig } from "@core/models/type";

export interface ConnectionConfigDocument extends ConnectionConfig, Document {
  _id: Types.ObjectId;
}

const connectionConfigSchema = new Schema<ConnectionConfigDocument>({
  dbType: { type: String, enum: ['mysql', 'mssql', 'postgresql', 'oracle', 'db2i', 'db2luw'], required: true },
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
