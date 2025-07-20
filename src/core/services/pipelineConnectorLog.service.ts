import { PipelineConnectorLogModel, PipelineConnectorLogDocument } from "@core/models/PipelineConnectorLog.js";
import { Types } from "mongoose";
import { ConnectorType } from "../models/type.js";

export type LogConnectorAction = "build" | "pause";
type LogStatus = "success" | "failed";

export interface CreateConnectorLogInput {
  pipelineId: string | Types.ObjectId;
  connectorName: string;
  connectorType: ConnectorType;
  action: LogConnectorAction;
  status: LogStatus;
  message?: string;
  createdBy: string;
}

export class PipelineConnectorLogService {
  /**
   * Create a new log entry for a connector.
   */
  async createLog(data: CreateConnectorLogInput): Promise<PipelineConnectorLogDocument> {
    const log = new PipelineConnectorLogModel({
      pipelineId: new Types.ObjectId(data.pipelineId),
      connectorName: data.connectorName,
      connectorType: data.connectorType,
      action: data.action,
      status: data.status,
      message: data.message,
      createdBy: data.createdBy,
    });

    return await log.save();
  }

  /**
   * Get latest log entry for each connector type (source and sink) of a pipeline.
   */
  async findLatestByPipeline(pipelineId: string | Types.ObjectId): Promise<Partial<Record<ConnectorType, PipelineConnectorLogDocument>>> {
    const logs = await PipelineConnectorLogModel.aggregate([
      { $match: { pipelineId: new Types.ObjectId(pipelineId) } },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: "$connectorType",
          lastLog: { $first: "$$ROOT" }
        }
      }
    ]);

    const result: Partial<Record<ConnectorType, PipelineConnectorLogDocument>> = {};
    for (const entry of logs) {
      result[entry._id as ConnectorType] = entry.lastLog;
    }

    return result;
  }

  /**
   * Get all logs of a specific pipeline, optionally filtered by connectorType.
   */
  async findAllByPipeline(pipelineId: string | Types.ObjectId, connectorType?: ConnectorType): Promise<PipelineConnectorLogDocument[]> {
    const filter: any = { pipelineId: new Types.ObjectId(pipelineId) };
    if (connectorType) {
      filter.connectorType = connectorType;
    }

    return await PipelineConnectorLogModel.find(filter).sort({ createdAt: -1 }).exec();
  }

  /**
   * Delete all logs of a pipeline (e.g., when pipeline is deleted).
   */
  async deleteByPipeline(pipelineId: string | Types.ObjectId): Promise<{ deletedCount?: number }> {
    return await PipelineConnectorLogModel.deleteMany({ pipelineId: new Types.ObjectId(pipelineId) });
  }
}
