import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import app from '@app/app.js';

// Mock controllers
vi.mock('@api/controllers/pipelineController.js', () => {
  return {
    PipelineController: class {
      create = vi.fn((req, res) => res.status(201).json({ message: 'create called' }));
      findAll = vi.fn((req, res) => res.json([{ id: 'pipeline1' }]));
      findById = vi.fn((req, res) => res.json({ id: req.params.id }));
      findAllWithPopulate = vi.fn((req, res) => res.json({ data: [{ id: 'populated' }] }));
      findByIdWithPopulate = vi.fn((req, res) => res.json({ id: req.params.id, populated: true }));
      updateById = vi.fn((req, res) => res.json({ id: req.params.id, updated: true }));
      updateFieldById = vi.fn((req, res) => res.json({ id: req.params.id, fieldUpdated: true }));
      deleteById = vi.fn((req, res) => res.status(204).send());
      deleteByIdMarked = vi.fn((req, res) => res.status(204).send());
      updateSettingsById = vi.fn((req, res) => res.json({ id: req.params.id, settingsUpdated: true }));
      toggleStatus = vi.fn((req, res) => res.json({ id: req.params.id, toggled: true }));
      build = vi.fn((req, res) => res.json({ id: req.params.id, built: true }));
      enableCDC = vi.fn((req, res) => res.json({ id: req.params.id, cdcEnabled: true }));
    }
  };
});

vi.mock('@core/controllers/connectionConfigController.js', () => {
  return {
    getAllConnectionConfigs: vi.fn((_req, res) => res.json([{ id: 'conn1' }])),
    getConnectionConfigById: vi.fn((req, res) => res.json({ id: req.params.id })),
    createConnectionConfig: vi.fn((req, res) => {
      const newConfig = { ...req.body, _id: 'mocked_id_123' };
      return res.status(201).json(newConfig);
    }),
    updateConnectionConfigById: vi.fn((req, res) => res.json({ id: req.params.id, updated: true })),
    deleteConnectionConfigById: vi.fn((req, res) => res.status(204).send()),
  };
});

describe('Pipeline API routes', () => {
  it('POST /api/pipelines/ should call create and return 201', async () => {
    const res = await request(app).post('/api/pipelines/').send({ name: 'test' });
    expect(res.status).toBe(201);
    expect(res.body.message).toBe('create called');
  });

  it('GET /api/pipelines/ should call findAllWithPopulate and return 200', async () => {
    const res = await request(app).get('/api/pipelines/');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: [{ id: 'populated' }] });
  });

  it('GET /api/pipelines/:id should call findById and return 200', async () => {
    const id = '123';
    const res = await request(app).get(`/api/pipelines/${id}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(id);
  });

  it('PUT /api/pipelines/:id should call updateById and return 200', async () => {
    const id = '123';
    const res = await request(app).put(`/api/pipelines/${id}`).send({ name: 'updated' });
    expect(res.status).toBe(200);
    expect(res.body.updated).toBe(true);
  });

  it('DELETE /api/pipelines/:id should call deleteById and return 204', async () => {
    const id = '123';
    const res = await request(app).delete(`/api/pipelines/${id}`);
    expect(res.status).toBe(204);
  });
});

describe('ConnectionConfig API routes', () => {
  it('GET /api/connection-configs should return all configs', async () => {
    const res = await request(app).get('/api/connection-configs');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ id: 'conn1' }]);
  });

  it('GET /api/connection-configs/:id should return a config', async () => {
    const id = 'abc';
    const res = await request(app).get(`/api/connection-configs/${id}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(id);
  });

  it('POST /api/connection-configs should create config with full payload', async () => {
    const payload = {
      name: 'Local MySQL',
      dbType: 'mysql',
      host: 'localhost',
      port: 3306,
      username: 'testuser',
      password: 'password123',
      database: 'testdb',
      ssl: false,
      dbSchema: 'public',
    };

    const res = await request(app).post('/api/connection-configs').send(payload);

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('_id');
    expect(res.body.name).toBe(payload.name);
    expect(res.body.dbType).toBe(payload.dbType);
  });


  it('PUT /api/connection-configs/:id should update config', async () => {
    const id = 'abc';
    const res = await request(app).put(`/api/connection-configs/${id}`).send({ name: 'updated' });
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(id);
    expect(res.body.updated).toBe(true);
  });

  it('DELETE /api/connection-configs/:id should delete config', async () => {
    const id = 'abc';
    const res = await request(app).delete(`/api/connection-configs/${id}`);
    expect(res.status).toBe(204);
  });
});
