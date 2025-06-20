import { Request, Response } from "express";
import { PipelineService } from "@core/services/pipeline.service.js";

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
}
