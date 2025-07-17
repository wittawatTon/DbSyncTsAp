import mongoose, { Schema, Document, Types, Model } from "mongoose";
import { ConnectorType } from "@core/models/type.js";

export interface PipelineConnectorLogDocument extends Document {
  pipelineId: Types.ObjectId;
  connectorName: string;
  connectorType: ConnectorType;
  action: "start" | "pause";
  status: "success" | "failed";
  message?: string;
  createdAt: Date;
  createdBy: string;
}

const pipelineConnectorLogSchema = new Schema<PipelineConnectorLogDocument>({
  pipelineId: { type: Schema.Types.ObjectId, ref: "Pipeline", required: true },
  connectorName: { type: String, required: true },
  connectorType: { type: String, enum: ["source", "sink"], required: true }, // ✅ เพิ่มตรงนี้
  action: { type: String, enum: ["start", "pause"], required: true },
  status: { type: String, enum: ["success", "failed"], required: true },
  message: { type: String },
  createdAt: { type: Date, default: Date.now },
  createdBy: { type: String, required: true },
});

export const PipelineConnectorLogModel: Model<PipelineConnectorLogDocument> =
  mongoose.model<PipelineConnectorLogDocument>("PipelineConnectorLog", pipelineConnectorLogSchema);
