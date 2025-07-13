import { PipelineModel, PipelineDocument, PipelineWithConnections } from "@core/models/pipeline.model.js";
import '@core/models/pipelineHistory.model.js';
import { ConnectionConfigModel , IDbConnection } from "@core/models/dbConnection.model.js";
import { GenericService } from "@core/services/genericCrud.service.js";
import { Types } from "mongoose";
import { updatePipelineSchema } from "@core/validators/pipeline.schema.js";
import { z } from "zod";

type PipelineSchemaKeys = keyof typeof updatePipelineSchema.shape;

//TODO: when create or update pipeline, check if a pipeline with the same source Table and
// target table already exists in same source and target connection return error
export class PipelineService {
  constructor(
    private baseService: GenericService<PipelineDocument> = new GenericService(PipelineModel)
  ) {}


  private async getConnectionId(connection: IDbConnection | Types.ObjectId): Promise<Types.ObjectId> {
    if (Types.ObjectId.isValid(connection as any)) {
      return connection as Types.ObjectId;
    }

    const connectionConfig = connection as IDbConnection;
    const existing = await ConnectionConfigModel.findOne({
      dbType: connectionConfig.dbType,
      host: connectionConfig.host,
      port: connectionConfig.port,
      database: connectionConfig.database
    });
  

    if (existing) return existing._id;

    const created = await ConnectionConfigModel.create(connection);
    return created._id;
  }

  /**
   * Check if a pipeline with the same sourceDbConnection and targetDbConnection exists.
   */
  async checkIfPipelineExists(source: IDbConnection | Types.ObjectId, target: IDbConnection | Types.ObjectId): Promise<boolean> {
    const sourceId = await this.getConnectionId(source);
    const targetId = await this.getConnectionId(target);

    const existingPipeline = await PipelineModel.findOne({
      sourceDbConnection: sourceId,
      targetDbConnection: targetId,
      status: { $ne: 'deleted' },
    });

    return !!existingPipeline;
  }

  

async create(data: Partial<PipelineDocument>) {
  // Handle sourceDbConnection
  if (
    data.sourceDbConnection &&
    typeof data.sourceDbConnection === "object" &&
    !Types.ObjectId.isValid(data.sourceDbConnection as any)
  ) {
    data.sourceDbConnection = await this.getConnectionId(data.sourceDbConnection);
  }

  // Handle targetDbConnection
  if (
    data.targetDbConnection &&
    typeof data.targetDbConnection === "object" &&
    !Types.ObjectId.isValid(data.targetDbConnection as any)
  ) {
    data.targetDbConnection = await this.getConnectionId(data.targetDbConnection);
  }

  // 🔍 Check if pipeline with same source and target already exists
  if (data.sourceDbConnection && data.targetDbConnection) {
    const exists = await this.checkIfPipelineExists(
      data.sourceDbConnection,
      data.targetDbConnection
    );

    /*if (exists) {
      throw new Error("Pipeline with the same source and target connection already exists.");
    }*/
  }

  return await this.baseService.create(data);
}


  // Fetch all pipelines without populating references
async findAll(query: {
  page?: number;
  limit?: number;
  filter?: Record<string, any>;
  sort?: Record<string, 1 | -1>;
  projection?: Record<string, 0 | 1>;
}) {
  const {
    page = 1,
    limit = 10,
    filter = {},
    sort = { createdAt: -1 },
    projection = {},
  } = query;

  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    PipelineModel.find(filter)
      .select(projection)
      .sort(sort)
      .skip(skip)
      .limit(limit),
    PipelineModel.countDocuments(filter),
  ]);

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

    // Fetch a single pipeline by ID without populating references
    async findById(id: string, projection: Record<string, 0 | 1> = {}) {
      console.log('PipelineService.findById called', id);
      return await this.findByIdWithPopulate(id);
    }


  // Fetch all pipelines with populated references
async findAllWithPopulate(query: {
  page?: number;
  limit?: number;
  filter?: Record<string, any>;
  sort?: Record<string, 1 | -1>;
  projection?: string;
}) {
  const {
    page = 1,
    limit = 10,
    filter = {},
    sort = { createdAt: -1 },
    projection = "",
  } = query;

  const skip = (page - 1) * limit;

  // เพิ่มเงื่อนไขให้ status ไม่เท่ากับ 'deleted'
  const finalFilter = {
    ...filter,
    status: { $ne: "deleted" },
  };


  const [data, total] = await Promise.all([
    PipelineModel.find(finalFilter)
      .select(projection)
      .populate([
        { path: "sourceDbConnection" },
        { path: "targetDbConnection" },
        { path: "historyLogs" },
      ])
      .sort(sort)
      .skip(skip)
      .limit(limit),
    PipelineModel.countDocuments(filter),
  ]);

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}


  // Fetch a single pipeline by ID with populated references
  async findByIdWithPopulate(id: string, projection = "") {
    if (!Types.ObjectId.isValid(id)) return null;
    return await PipelineModel.findById(id)
      .select(projection)
      .populate([
        { path: "sourceDbConnection" },
        { path: "targetDbConnection" },
        { path: "historyLogs" },
      ])
      .exec() as PipelineWithConnections;
  }

  // Update pipeline
async updateById(id: string, update: Partial<PipelineDocument>) {
  // Handle sourceDbConnection
  if (update.sourceDbConnection && typeof update.sourceDbConnection === 'object' && !Types.ObjectId.isValid(update.sourceDbConnection as any)) {
    update.sourceDbConnection = await this.getConnectionId(update.sourceDbConnection);
  }

  // Handle targetDbConnection
  if (update.targetDbConnection && typeof update.targetDbConnection === 'object' && !Types.ObjectId.isValid(update.targetDbConnection as any)) {
    update.targetDbConnection = await this.getConnectionId(update.targetDbConnection);
  }

  return await this.baseService.updateById(id, update);
}


  // Delete pipeline
  async deleteById(id: string) {
    return await this.baseService.deleteById(id);
  }

  async deleteByIdMarked(id: string) {
    return await PipelineModel.findByIdAndUpdate(
      id,
      { status: "deleted" },
      { new: true } // คืนค่าหลังอัปเดต
    );
  }

  // Update a specific field of a pipeline
  async updateFieldById<T extends PipelineSchemaKeys>(
    id: string,
    field: T,
    value: z.infer<typeof updatePipelineSchema>[T]
  ) {
    if (!Types.ObjectId.isValid(id)) {
      throw new Error("Invalid pipeline ID");
    }

    const fieldSchema = updatePipelineSchema.shape[field];
    if (!fieldSchema) {
      throw new Error(`Field "${String(field)}" is not allowed to update.`);
    }

    const parsed = fieldSchema.safeParse(value);
    if (!parsed.success) {
      throw new Error(`Validation failed: ${JSON.stringify(parsed.error.format())}`);
    }

    const updatePayload = { [field]: value } as Partial<PipelineDocument>;
    return await this.baseService.updateById(id, updatePayload);
  }

    async updateSettingsById(id: string, settings: Partial<PipelineDocument["settings"]>) {
    if (!Types.ObjectId.isValid(id)) {
      throw new Error("Invalid pipeline ID");
    }

    // Optional: คุณอาจเพิ่มการ validate settings ตรงนี้ด้วย zod schema หรือ manual validation
    // เช่นตรวจว่า mode มีค่าถูกต้อง หรือ batchSize เป็น number

    const updated = await PipelineModel.findByIdAndUpdate(
      id,
      { $set: { settings } },
      { new: true }
    );

    if (!updated) {
      throw new Error("Pipeline not found or update failed");
    }

    return updated;
  }


}
