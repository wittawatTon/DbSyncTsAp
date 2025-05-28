import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { PipelineService } from "@core/services/pipeline.service";
import { GenericService } from "@core/services/genericCrud.service";
import { PipelineModel } from "@core/models/pipeline.model";
import { Types } from "mongoose";

// Mock PipelineModel for tests
vi.mock("@core/models/pipeline.model", () => ({
  PipelineModel: {
    find: vi.fn(),
    findById: vi.fn(),
  },
}));

describe("PipelineService", () => {
  let pipelineService: PipelineService;
  let mockBaseService: ReturnType<typeof createMockBaseService>;

  function createMockBaseService() {
    return {
      create: vi.fn(),
      findAll: vi.fn(),
      findById: vi.fn(),
      updateById: vi.fn(),
      deleteById: vi.fn(),
    };
  }

  beforeEach(() => {
    mockBaseService = createMockBaseService();
    pipelineService = new PipelineService(mockBaseService as any);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("create", () => {
    it("should call baseService.create with data and return result", async () => {
      const data = { name: "pipeline1" };
      const result = { _id: "123", ...data };
      mockBaseService.create.mockResolvedValue(result);

      const res = await pipelineService.create(data);

      expect(mockBaseService.create).toHaveBeenCalledWith(data);
      expect(res).toEqual(result);
    });
  });

  describe("findAll", () => {
    it("should call baseService.findAll and return result", async () => {
      const pipelines = [{ _id: "1" }, { _id: "2" }];
      mockBaseService.findAll.mockResolvedValue(pipelines);

      const res = await pipelineService.findAll();

      expect(mockBaseService.findAll).toHaveBeenCalled();
      expect(res).toEqual(pipelines);
    });
  });

  describe("findById", () => {
    it("should call baseService.findById with given id and return result", async () => {
      const id = new Types.ObjectId().toHexString();
      const pipeline = { _id: id };
      mockBaseService.findById.mockResolvedValue(pipeline);

      const res = await pipelineService.findById(id);

      expect(mockBaseService.findById).toHaveBeenCalledWith(id);
      expect(res).toEqual(pipeline);
    });
  });

  describe("findAllWithPopulate", () => {
    it("should call PipelineModel.find().select().populate().exec() and return result", async () => {
      const execMock = vi.fn().mockResolvedValue([{ _id: "1" }]);
      const populateMock = vi.fn(() => ({ exec: execMock }));
      const selectMock = vi.fn(() => ({ populate: populateMock }));

      const findSpy = vi.spyOn(PipelineModel, "find").mockReturnValue({
        select: selectMock,
      } as any);

      const result = await pipelineService.findAllWithPopulate();

      expect(findSpy).toHaveBeenCalled();
      expect(selectMock).toHaveBeenCalledWith("");
      expect(populateMock).toHaveBeenCalledWith([
        { path: "sourceDbConnection" },
        { path: "targetDbConnection" },
        { path: "historyLogs" },
      ]);
      expect(execMock).toHaveBeenCalled();
      expect(result).toEqual([{ _id: "1" }]);

      findSpy.mockRestore();
    });
  });

  describe("findByIdWithPopulate", () => {
    it("should return null if id is invalid", async () => {
      const invalidId = "12345";
      const res = await pipelineService.findByIdWithPopulate(invalidId);
      expect(res).toBeNull();
    });

    it("should call PipelineModel.findById().select().populate().exec() with valid id", async () => {
      const id = new Types.ObjectId().toHexString();
      const execMock = vi.fn().mockResolvedValue({ _id: id });
      const populateMock = vi.fn(() => ({ exec: execMock }));
      const selectMock = vi.fn(() => ({ populate: populateMock }));

      const findByIdSpy = vi.spyOn(PipelineModel, "findById").mockReturnValue({
        select: selectMock,
      } as any);

      const result = await pipelineService.findByIdWithPopulate(id);

      expect(findByIdSpy).toHaveBeenCalledWith(id);
      expect(selectMock).toHaveBeenCalledWith("");
      expect(populateMock).toHaveBeenCalledWith([
        { path: "sourceDbConnection" },
        { path: "targetDbConnection" },
        { path: "historyLogs" },
      ]);
      expect(execMock).toHaveBeenCalled();
      expect(result).toEqual({ _id: id });

      findByIdSpy.mockRestore();
    });
  });

  describe("updateById", () => {
    it("should call baseService.updateById with id and update", async () => {
      const id = new Types.ObjectId().toHexString();
      const update = { name: "updatedName" };
      const updated = { _id: id, ...update };
      mockBaseService.updateById.mockResolvedValue(updated);

      const res = await pipelineService.updateById(id, update);

      expect(mockBaseService.updateById).toHaveBeenCalledWith(id, update);
      expect(res).toEqual(updated);
    });
  });

  describe("deleteById", () => {
    it("should call baseService.deleteById with id and return result", async () => {
      const id = new Types.ObjectId().toHexString();
      const deleted = { _id: id };
      mockBaseService.deleteById.mockResolvedValue(deleted);

      const res = await pipelineService.deleteById(id);

      expect(mockBaseService.deleteById).toHaveBeenCalledWith(id);
      expect(res).toEqual(deleted);
    });
  });

  describe("updateFieldById", () => {
    const validId = new Types.ObjectId().toHexString();

    it("should throw error if id is invalid", async () => {
      await expect(
        pipelineService.updateFieldById("invalidId", "name", "value")
      ).rejects.toThrow("Invalid pipeline ID");
    });

    it("should throw error if field is not allowed", async () => {
      const invalidKey = "invalidField" as any;
      await expect(
        pipelineService.updateFieldById(validId, invalidKey, "value")
      ).rejects.toThrow(/Field "invalidField" is not allowed to update/);
    });

    it("should throw error if value fails validation", async () => {
      // Assuming "name" should be string, passing number triggers validation error
      await expect(
        pipelineService.updateFieldById(validId, "name", 123 as any)
      ).rejects.toThrow(/Validation failed/);
    });

    it("should call baseService.updateById with valid data and return result", async () => {
      const field = "name";
      const value = "Valid Pipeline Name";
      const updated = { _id: validId, [field]: value };
      mockBaseService.updateById.mockResolvedValue(updated);

      const res = await pipelineService.updateFieldById(validId, field, value);

      expect(mockBaseService.updateById).toHaveBeenCalledWith(validId, { [field]: value });
      expect(res).toEqual(updated);
    });
  });
});
