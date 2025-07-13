import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { Types,Model  } from 'mongoose';
import { ConnectionConfigService } from '@core/services/connectionConfig.service.js';
import { ConnectionConfigModel } from '@core/models/dbConnection.model.js';


// Correctly mock the model from its actual path
vi.mock('@core/models/dbConnection.model.js', () => {
  // Mock for instance method `save`
  const mockSave = vi.fn();

  // Create Mock Constructor Function (like new Model())
  const MockModel = vi.fn().mockImplementation(data => ({
    ...data,
    save: mockSave,
  }));

  // Attach static methods
  Object.assign(MockModel, {
    find: vi.fn(),
    findById: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    findByIdAndDelete: vi.fn(),
  });

  // Attach mockSave to be accessible from test code
  (MockModel as any).mockSave = mockSave;

  return { ConnectionConfigModel: MockModel };
});


// Use vi.mocked to get a typed mock object
const MockedConnectionConfigModel = vi.mocked(ConnectionConfigModel, true);
const mockSave = (MockedConnectionConfigModel as any).mockSave;

describe('ConnectionConfigService', () => {
  let service: ConnectionConfigService;

  // Test Data
  const mockId = new Types.ObjectId().toHexString();
  const mockConfig = {
    _id: mockId,
    name: 'Test Config',
    dbType: 'postgres',
    host: 'localhost',
    port: 5432,
    username: 'user',
    password: 'password',
    database: 'testdb',
  };

  beforeEach(() => {
    // The service now receives the mocked model constructor
    service = new ConnectionConfigService(MockedConnectionConfigModel);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new connection configuration successfully', async () => {
      const newConfigData = { name: 'New DB', dbType: 'mysql' };
      mockSave.mockResolvedValue({ ...newConfigData, _id: new Types.ObjectId() });

      const result = await service.create(newConfigData as any);

      expect(MockedConnectionConfigModel).toHaveBeenCalledWith(newConfigData);
      expect(mockSave).toHaveBeenCalled();
      expect(result.name).toBe(newConfigData.name);
      expect(result.dbType).toBe(newConfigData.dbType);
    });
  });

  describe('findAll', () => {
    it('should retrieve all connection configurations', async () => {
      const mockConfigs = [mockConfig, { ...mockConfig, _id: new Types.ObjectId().toHexString(), name: 'Second Config' }];
      const selectMock = vi.fn().mockResolvedValue(mockConfigs);
      MockedConnectionConfigModel.find.mockReturnValue({ select: selectMock } as any);

      const result = await service.findAll();

      expect(MockedConnectionConfigModel.find).toHaveBeenCalled();
      expect(selectMock).toHaveBeenCalledWith('');
      expect(result).toEqual(mockConfigs);
      expect(result.length).toBe(2);
    });
  });

  describe('findById', () => {
    it('should return a connection config for a valid ID', async () => {
      const selectMock = vi.fn().mockResolvedValue(mockConfig);
      MockedConnectionConfigModel.findById.mockReturnValue({ select: selectMock } as any);

      const result = await service.findById(mockId);

      expect(MockedConnectionConfigModel.findById).toHaveBeenCalledWith(mockId);
      expect(selectMock).toHaveBeenCalledWith('');
      expect(result).toEqual(mockConfig);
    });

    it('should return null if the ID format is invalid', async () => {
      const invalidId = 'invalid-id';
      const result = await service.findById(invalidId);
      
      expect(result).toBeNull();
      expect(MockedConnectionConfigModel.findById).not.toHaveBeenCalled();
    });

    it('should return null if no document is found for a valid ID', async () => {
      const selectMock = vi.fn().mockResolvedValue(null);
      MockedConnectionConfigModel.findById.mockReturnValue({ select: selectMock } as any);

      const result = await service.findById(mockId);

      expect(MockedConnectionConfigModel.findById).toHaveBeenCalledWith(mockId);
      expect(selectMock).toHaveBeenCalledWith('');
      expect(result).toBeNull();
    });
  });

  describe('updateById', () => {
    it('should update a connection config successfully', async () => {
      const updateData = { host: 'new-host.com' };
      const updatedDoc = { ...mockConfig, ...updateData };
      MockedConnectionConfigModel.findByIdAndUpdate.mockResolvedValue(updatedDoc);

      const result = await service.updateById(mockId, updateData as any);

      expect(MockedConnectionConfigModel.findByIdAndUpdate).toHaveBeenCalledWith(
        mockId,
        updateData,
        { new: true, runValidators: true }
      );
      expect(result).toEqual(updatedDoc);
      expect(result?.host).toBe('new-host.com');
    });

    it('should return null when trying to update a non-existent config', async () => {
      const updateData = { host: 'new-host.com' };
      MockedConnectionConfigModel.findByIdAndUpdate.mockResolvedValue(null);

      const result = await service.updateById(mockId, updateData as any);

      expect(MockedConnectionConfigModel.findByIdAndUpdate).toHaveBeenCalledWith(
        mockId,
        updateData,
        { new: true, runValidators: true }
      );
      expect(result).toBeNull();
    });
  });

  describe('deleteById', () => {
    it('should delete a connection config successfully', async () => {
      MockedConnectionConfigModel.findByIdAndDelete.mockResolvedValue(mockConfig);

      const result = await service.deleteById(mockId);

      expect(MockedConnectionConfigModel.findByIdAndDelete).toHaveBeenCalledWith(mockId);
      expect(result).toEqual(mockConfig);
    });

    it('should return null when trying to delete a non-existent config', async () => {
      MockedConnectionConfigModel.findByIdAndDelete.mockResolvedValue(null);

      const result = await service.deleteById(mockId);

      expect(MockedConnectionConfigModel.findByIdAndDelete).toHaveBeenCalledWith(mockId);
      expect(result).toBeNull();
    });

    it('should return null if the ID format is invalid', async () => {
      const invalidId = 'invalid-id';
      const result = await service.deleteById(invalidId);

      expect(result).toBeNull();
      expect(MockedConnectionConfigModel.findByIdAndDelete).not.toHaveBeenCalled();
    });
  });
});
