import { Request, Response } from "express";
import { PipelineService } from "@core/services/pipeline.service.js";
import { build, toggleConnectorByPipelineId } from "@kafka/debeziumControl/services/pipelineService.js"
import { enableCDC, CDCNotEnabledError} from "kafka/debeziumControl/services/cdcEnable.js"

const pipelineService = new PipelineService();

export class PipelineController {
  async create(req: Request, res: Response) {
    try {
      const pipeline = await pipelineService.create(req.body);
      res.status(201).json(pipeline);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

async findAll(req: Request, res: Response) {
  try {
    let projection: Record<string, 0 | 1> = {};
    
    if (req.query.projection) {
      try {
        projection = JSON.parse(req.query.projection as string);
      } catch (parseError) {
        return res.status(400).json({ error: 'Invalid projection format. It must be valid JSON.' });
      }
    }

    const pipelines = await pipelineService.findAll(projection);
    res.status(200).json(pipelines);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async findById(req: Request, res: Response) {
  try {
    let projection: Record<string, 0 | 1> = {};

    if (req.query.projection) {
      try {
        projection = JSON.parse(req.query.projection as string);
      } catch (parseError) {
        return res.status(400).json({ error: 'Invalid projection format. It must be valid JSON.' });
      }
    }

    const pipeline = await pipelineService.findById(req.params.id, projection);
    if (!pipeline) {
      return res.status(404).json({ error: "Pipeline not found" });
    }

    res.status(200).json(pipeline);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}



async findAllWithPopulate(req: Request, res: Response) {
  try {
    const {
      page = "1",
      limit = "10",
      sort = '{"createdAt": -1}',
      filter = "{}",      // e.g. ?filter={"status":"active"}
      projection = "",    // e.g. ?projection=name,status
    } = req.query;

    const parsedQuery = {
      page: parseInt(page as string, 10),
      limit: parseInt(limit as string, 10),
      sort: JSON.parse(sort as string),
      filter: JSON.parse(filter as string),
      projection: projection as string,
    };

    const pipelines = await pipelineService.findAllWithPopulate(parsedQuery);
    res.status(200).json(pipelines);
  } catch (error) {
    console.error("findAllWithPopulate error:", error);
    res.status(400).json({ error: error.message });
  }
}


  async findByIdWithPopulate(req: Request, res: Response) {
    try {
      const pipeline = await pipelineService.findByIdWithPopulate(req.params.id, req.query.projection as string);
      if (!pipeline) {
        return res.status(404).json({ error: "Pipeline not found" });
      }
      res.status(200).json(pipeline);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async updateById(req: Request, res: Response) {
    try {
      const pipeline = await pipelineService.updateById(req.params.id, req.body);
      res.status(200).json(pipeline);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async deleteById(req: Request, res: Response) {
    try {
      await pipelineService.deleteById(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

    async deleteByIdMarked(req: Request, res: Response) {
    try {
      await pipelineService.deleteByIdMarked(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async updateFieldById(req: Request, res: Response) {
    try {
      const { field, value } = req.body;
      const pipeline = await pipelineService.updateFieldById(req.params.id, field, value);
      res.status(200).json(pipeline);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

    async updateSettingsById(req: Request, res: Response) {
    try {
      const pipeline = await pipelineService.updateSettingsById(req.params.id, req.body);
      res.status(200).json(pipeline);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async toggleStatus(req: Request, res: Response) {
    const { id } = req.params; // pipelineId
    const { type, action } = req.body; // type: "source" | "sink", action: "start" | "stop"
    const createdBy = req.user as string || "system"; // ดึงจาก session หรือ token ถ้ามี

    if (!["source", "sink"].includes(type) || !["start", "stop"].includes(action)) {
      return res.status(400).json({ error: "Invalid type or action" });
    }

    try {
      const result = await toggleConnectorByPipelineId(id, type, action, createdBy);

      return res.json({
        success: true,
        data: {
          pipelineId: id,
          connectorType: type,
          action,
          result, // "started" | "stopped" | "skipped" | "error"
        },
      });
    } catch (err) {
      console.error("Error toggling connector status:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }


   /**
   * Build and start a pipeline (validate + enable CDC + start connectors).
   * @route POST /pipeline/:id/build
   */
  async build(req: Request, res: Response) {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ success: false, error: "Pipeline ID is required" });
    }

    try {
      const resultMessage = await build(id);

      return res.json({
        success: true,
        message: resultMessage,
        data: { pipelineId: id },
      });

    } catch (err: any) {
      console.error("Build pipeline failed:", err);

      if (err instanceof CDCNotEnabledError) {
        return res.status(400).json({
          success: false,
          error: "CDC not enabled",
          message: err.message,
          suggestion: err.sqlToEnable, // ส่ง SQL ที่ควร run ไปให้ frontend
        });
      }

      return res.status(500).json({
        success: false,
        error: "Failed to build pipeline",
        message: err.message,
      });
    }
  }

  async enableCDC(req: Request, res: Response) {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ success: false, error: "Pipeline ID is required" });
    }

    try {
      const result = await enableCDC(id);

      return res.json({
        success: true,
        message: result ? "✅ CDC enabled successfully" : "⚠️ CDC was already enabled",
        data: { pipelineId: id },
      });
    } catch (err: any) {
      console.error("Enable CDC failed:", err);
      return res.status(500).json({
        success: false,
        error: "Failed to enable CDC",
        message: err.message,
      });
    }
  }

}


