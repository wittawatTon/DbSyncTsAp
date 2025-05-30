// @core/validators/pipeline.schema.ts
import { z } from "zod";

export const updatePipelineSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.enum(['draft','active', 'paused', 'stopped']).optional(),

  sourceDbConnection: z.string().refine(val => val.match(/^[a-f\d]{24}$/i), {
    message: "Invalid ObjectId"
  }).optional(),

  targetDbConnection: z.string().refine(val => val.match(/^[a-f\d]{24}$/i), {
    message: "Invalid ObjectId"
  }).optional(),

  sourceTables: z.array(z.string().regex(/^[a-f\d]{24}$/i)).optional(),
  targetTables: z.array(z.string().regex(/^[a-f\d]{24}$/i)).optional(),

  historyLogs: z.array(z.string().regex(/^[a-f\d]{24}$/i)).optional(),

  lastRunAt: z.date().optional(),
  lastSuccessRunAt: z.date().optional(),
  lastErrorMessage: z.string().optional(),
  errorLogs: z.array(z.string()).optional(),

  schedule: z.string().optional(),
  ownerUserId: z.string().min(1).optional(),
});
