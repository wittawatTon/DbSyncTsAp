import { PipelineWithConnections } from "@core/models/pipeline.model.js";
import { createDebeziumConnectorConfig } from "./createConnectorJson.js"
import { PipelineService } from "@core/services/pipeline.service.js";
import { PipelineConnectorLogService } from "@core/services/pipelineConnectorLog.service.js";
import { CDCNotEnabledError, CheckEnableCDC } from "./cdcEnable.js";

import {
  createConnector,
  getConnectorStatus,
  resumeConnector,
  pauseConnector,
} from '@kafka/debeziumControl/services/debeziumService.js';

/* TODO: กรณี docker kafka down ต้องสร้าง connector ใหม่ */

//สร้าง Pipeline ใหม่ โดยมีขั้นตอน
//TODO:ตรวจสอบข้อมูล table source ที่ selected ต้องมี primarykey, name ของ Source ต้องไม่ซ้ำกับที่ใช้ไปแล้ว เพราะเอาไปตั้ง topic
//1. ตรวจสอบว่า Source พร้อม CDC for mssql must run script ถ้าไม่ให้ Error แล้วให้ใช้ Service enableCDC เปิด
//2. สร้าง connection source 
//3. สร้าง connection sink 
// --- Create Sync Task API ---

export const build = async (pipelineId: string): Promise<string> => {
  const pipelineService = new PipelineService();

  try {
    // ดึงข้อมูล pipeline พร้อม populate connection
    const pipeline = await pipelineService.findByIdWithPopulate(pipelineId) as PipelineWithConnections;

    if (!pipeline) {
      throw new Error(`No pipeline found for ID: ${pipelineId}`);
    }
/*
    // 1. ตรวจสอบ table source ที่ selected ต้องมี primary key
    const invalidTables = pipeline.sourceTables.filter(table => {
      const hasPrimaryKey = pipeline.settings.primaryKeys.some(pk => table.columns.some(col => col.name === pk));
      return !hasPrimaryKey;
    });

    if (invalidTables.length > 0) {
      throw new Error(`Source tables missing primary key: ${invalidTables.map(t => t.name).join(", ")}`);
    }
*/

    // 2. สำหรับ MSSQL ตรวจสอบ CDC พร้อม ถ้าไม่เปิดให้ error
    if (pipeline.sourceDbConnection.dbType === "mssql") {
      const { enabled, enableSql } = await CheckEnableCDC(pipelineId);
      if (!enabled) {
        throw new CDCNotEnabledError(
          `CDC not enabled for MSSQL database in pipeline ${pipelineId}`,
          enableSql
        );
      }
    }

    // 3. เรียกเปิด connector ทั้ง source และ sink
    await toggleConnectorByPipelineId(pipelineId, "source", "start");
    await toggleConnectorByPipelineId(pipelineId, "sink", "start");

    return "✅ Build pipeline success";
  } catch (error) {
    console.error("❌ Build failed:", error);
    throw error;
  }
};



export const toggleConnectorByPipelineId = async (
  pipelineId: string,
  type: "source" | "sink",
  action: "start" | "stop",
  createdBy = "system"
): Promise<"started" | "stopped" | "skipped" | "error"> => {
  const logService = new PipelineConnectorLogService();

  try {
    // ดึง log ล่าสุดของ type นี้จาก pipeline
    const latestLogs = await logService.findLatestByPipeline(pipelineId);
    const latestLog = latestLogs[type];
    let status;
    let connectorName: string | undefined;

    if (latestLog) {
      connectorName = latestLog.connectorName;
      const isRunning = latestLog.action === "start" && latestLog.status === "success";
      if (isRunning) {
        status = await getConnectorStatus(connectorName);
      }
    }

    if (action === "start") {
      if (!status) {
        // connector not found → create
        const config = await createDebeziumConnectorConfig(pipelineId, type);

        if (!config?.name) {
          throw new Error(`Cannot resolve connector config or name for pipeline ${pipelineId}`);
        }

        connectorName = config.name;

        await createConnector(config);

        await logService.createLog({
          pipelineId,
          connectorName,
          connectorType: type,
          action: "start",
          status: "success",
          message: `Created and started connector`,
          createdBy,
        });

        return "started";
      }

      if (status.connector.state === "RUNNING") {
        return "skipped"; // already running
      }

      // resume existing connector
      await resumeConnector(connectorName!);

      await logService.createLog({
        pipelineId,
        connectorName,
        connectorType: type,
        action: "start",
        status: "success",
        message: `Resumed existing connector`,
        createdBy,
      });

      return "started";
    }

    if (action === "stop") {
      if (!status || status.connector.state !== "RUNNING") {
        return "skipped"; // already stopped or not exist
      }

      await pauseConnector(connectorName!);

      await logService.createLog({
        pipelineId,
        connectorName,
        connectorType: type,
        action: "stop",
        status: "success",
        message: `Paused connector`,
        createdBy,
      });

      return "stopped";
    }

    throw new Error("Invalid action");

  } catch (err: any) {
    await logService.createLog({
      pipelineId,
      connectorName: `${type}-unknown`,
      connectorType: type,
      action,
      status: "failed",
      message: err.message,
      createdBy,
    });

    console.error(`❌ Failed to ${action} connector [${type}] for pipeline ${pipelineId}:`, err);
    return "error";
  }
};


