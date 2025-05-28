import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { Types } from 'mongoose';
import { ConnectionConfigService } from '@core/services/connectionConfig.service';
import { ConnectionConfigModel } from '@core/models/connectionConfig.model';

vi.mock('@core/models/connectionConfig.model', () => {
  return {
    ConnectionConfigModel: {
      find: vi.fn(),
      findById: vi.fn(),
      findByIdAndUpdate: vi.fn(),
      findByIdAndDelete: vi.fn(),
    },
  };
});

describe('ConnectionConfigService', () => {
  let service: ConnectionConfigService;

  beforeEach(() => {
    // Create service instance before each test
    service = new ConnectionConfigService(ConnectionConfigModel);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should create new connection config with valid data', async () => {
    const mockData = { name: 'TestConfig', value: 'abc' };
    const mockSavedDoc = { ...mockData, _id: new Types.ObjectId() };
    const mockSave = vi.fn().mockResolvedValue(mockSavedDoc);

    // Mock the model constructor to return an object with save method
    const MockConstructor = vi.fn(() => ({
      ...mockData,
      save: mockSave,
    }));

    // Temporarily override the model inside the service instance
    (service as any).model = MockConstructor;

    const result = await service.create(mockData as any);

    expect(MockConstructor).toHaveBeenCalledWith(mockData);
    expect(mockSave).toHaveBeenCalled();
    expect(result).toEqual(mockSavedDoc);
  });

  it('should retrieve all connection configs', async () => {
    const mockDocs = [
      { _id: new Types.ObjectId(), name: 'A' },
      { _id: new Types.ObjectId(), name: 'B' },
    ];
    const selectMock = vi.fn().mockResolvedValue(mockDocs);
    (ConnectionConfigModel.find as any).mockReturnValue({ select: selectMock });

    const result = await service.findAll();

    expect(ConnectionConfigModel.find).toHaveBeenCalled();
    expect(selectMock).toHaveBeenCalledWith('');
    expect(result).toEqual(mockDocs);
  });

  it('should update connection config by id with valid data', async () => {
    const id = new Types.ObjectId().toHexString();
    const updateData = { value: 'updated' };
    const updatedDoc = { _id: id, ...updateData };

    (ConnectionConfigModel.findByIdAndUpdate as any).mockResolvedValue(updatedDoc);

    const result = await service.updateById(id, updateData as any);

    expect(ConnectionConfigModel.findByIdAndUpdate).toHaveBeenCalledWith(id, updateData, {
      new: true,
      runValidators: true,
    });
    expect(result).toEqual(updatedDoc);
  });

  it('should return null when finding by invalid id', async () => {
    const invalidId = 'notavalidobjectid';

    const result = await service.findById(invalidId);

    expect(result).toBeNull();
    expect(ConnectionConfigModel.findById).not.toHaveBeenCalled();
  });

  it('should return null when updating nonexistent id', async () => {
    const id = new Types.ObjectId().toHexString();
    const updateData = { value: 'noexist' };

    (ConnectionConfigModel.findByIdAndUpdate as any).mockResolvedValue(null);

    const result = await service.updateById(id, updateData as any);

    expect(ConnectionConfigModel.findByIdAndUpdate).toHaveBeenCalledWith(id, updateData, {
      new: true,
      runValidators: true,
    });
    expect(result).toBeNull();
  });

  it('should return null when deleting with invalid id', async () => {
    const invalidId = 'invalid';

    const result = await service.deleteById(invalidId);

    expect(result).toBeNull();
    expect(ConnectionConfigModel.findByIdAndDelete).not.toHaveBeenCalled();
  });

  it('should delete connection config with valid id', async () => {
    const validId = new Types.ObjectId().toHexString();
    const deletedDoc = { _id: validId, name: 'ToDelete' };

    (ConnectionConfigModel.findByIdAndDelete as any).mockResolvedValue(deletedDoc);

    const result = await service.deleteById(validId);

    expect(ConnectionConfigModel.findByIdAndDelete).toHaveBeenCalledWith(validId);
    expect(result).toEqual(deletedDoc);
  });
});
