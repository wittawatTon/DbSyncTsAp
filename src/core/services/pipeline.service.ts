import { PipelineModel, PipelineDocument } from "@core/models/pipeline.model";
import { GenericService } from "@core/services/genericCrud.service";
import { PopulateOptions, Types } from "mongoose";
import { updatePipelineSchema } from "@core/validators/pipeline.schema";
import { z } from "zod";

type PipelineSchemaKeys = keyof typeof updatePipelineSchema.shape;

export class PipelineService {
  private baseService = new GenericService<PipelineDocument>(PipelineModel);

  // สร้างใหม่
  async create(data: Partial<PipelineDocument>) {
    return await this.baseService.create(data);
  }

  // ดึงทั้งหมด แบบไม่ populate
  async findAll(projection = "") {
    return await this.baseService.findAll(projection);
  }

  // ดึงรายตัว แบบไม่ populate
  async findById(id: string, projection = "") {
    return await this.baseService.findById(id, projection);
  }

  // ดึงทั้งหมด พร้อม populate
  async findAllWithPopulate(projection = "") {
    return await PipelineModel.find()
      .select(projection)
      .populate([
        { path: "sourceDbConnection" },
        { path: "targetDbConnection" },
        { path: "sourceTables" },
        { path: "targetTables" },
        { path: "historyLogs" },
      ])
      .exec();
  }

  // ดึงรายตัว พร้อม populate
  async findByIdWithPopulate(id: string, projection = "") {
    if (!Types.ObjectId.isValid(id)) return null;
    return await PipelineModel.findById(id)
      .select(projection)
      .populate([
        { path: "sourceDbConnection" },
        { path: "targetDbConnection" },
        { path: "sourceTables" },
        { path: "targetTables" },
        { path: "historyLogs" },
      ])
      .exec();
  }

  // อัปเดต
  async updateById(id: string, update: Partial<PipelineDocument>) {
    return await this.baseService.updateById(id, update);
  }

  // ลบ
  async deleteById(id: string) {
    return await this.baseService.deleteById(id);
  }

  async updateFieldById<T extends PipelineSchemaKeys>(
    id: string,
    field: T,
    value: z.infer<typeof updatePipelineSchema>[T]
  ) {
    if (!Types.ObjectId.isValid(id)) {
      throw new Error("Invalid pipeline ID");
    }

    // ✅ กรอง schema สำหรับ field เดียว
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
}


