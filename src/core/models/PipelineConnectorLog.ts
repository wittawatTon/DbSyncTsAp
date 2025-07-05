import mongoose, { Schema, Document, Types, Model } from "mongoose";
export interface PipelineConnectorLogDocument extends Document {
  pipelineId: Types.ObjectId;
  connectorName: string;
  connectorType: "source" | "sink"; // 👈 ใหม่: แยกชนิด connector ชัดเจน
  action: "start" | "stop";
  status: "success" | "failed";
  message?: string;
  createdAt: Date;
  createdBy: string;
}

const pipelineConnectorLogSchema = new Schema<PipelineConnectorLogDocument>({
  pipelineId: { type: Schema.Types.ObjectId, ref: "Pipeline", required: true },
  connectorName: { type: String, required: true },
  connectorType: { type: String, enum: ["source", "sink"], required: true }, // ✅ เพิ่มตรงนี้
  action: { type: String, enum: ["start", "stop"], required: true },
  status: { type: String, enum: ["success", "failed"], required: true },
  message: { type: String },
  createdAt: { type: Date, default: Date.now },
  createdBy: { type: String, required: true },
});

export const PipelineConnectorLogModel: Model<PipelineConnectorLogDocument> =
  mongoose.model<PipelineConnectorLogDocument>("PipelineConnectorLog", pipelineConnectorLogSchema);
