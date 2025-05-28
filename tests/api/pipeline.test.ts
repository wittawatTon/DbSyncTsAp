import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import app from '../../src/app.js';  
// Mock controllers
vi.mock('@core/controllers/pipelineController', () => {
  return {
    PipelineController: class {
      create = vi.fn((req, res) => res.status(201).json({ message: 'create called' }));
      createIfNotExist = vi.fn((req, res) => res.status(201).json({ message: 'createIfNotExist called' }));
      findAll = vi.fn((req, res) => res.json([{ id: 'pipeline1' }]));
      findAllWithPopulate = vi.fn((req, res) => res.json([{ id: 'pipelinePopulated' }]));
      findById = vi.fn((req, res) => res.json({ id: req.params.id }));
      findByIdWithPopulate = vi.fn((req, res) => res.json({ id: req.params.id, populated: true }));
      updateById = vi.fn((req, res) => res.json({ id: req.params.id, updated: true }));
      updateFieldById = vi.fn((req, res) => res.json({ id: req.params.id, fieldUpdated: true }));
      deleteById = vi.fn((req, res) => res.status(204).send());
    }
  };
});

vi.mock('@core/controllers/connectionConfigController', () => ({
  getAllConnectionConfigs: (req, res) => res.json([{ id: 'conn1' }]),
  getConnectionConfigById: (req, res) => res.json({ id: req.params.id }),
  createConnectionConfig: (req, res) => res.status(201).json({ message: 'conn create called' }),
  updateConnectionConfigById: (req, res) => res.json({ id: req.params.id, updated: true }),
  deleteConnectionConfigById: (req, res) => res.status(204).send(),
   createIfNotExist: (req, res) => res.status(201).json({ message: 'conn createIfNotExist called' }),

}));

describe('Pipeline API routes', () => {
  it('POST /api/pipelines/ should call create and return 201', async () => {
    const res = await request(app).post('/api/pipelines/').send({ name: 'test' });
    expect(res.status).toBe(201);
    expect(res.body.message).toBe('create called');
  });

  it('GET /api/pipelines/ should return all pipelines', async () => {
    const res = await request(app).get('/api/pipelines/');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0].id).toBe('pipeline1');
  });

  it('GET /api/pipelines/with-populate should return populated pipelines', async () => {
    const res = await request(app).get('/api/pipelines/with-populate');
    expect(res.status).toBe(200);
    expect(res.body[0].id).toBe('pipelinePopulated');
  });

  it('GET /api/pipelines/:id should return a pipeline', async () => {
    const id = '123';
    const res = await request(app).get(`/api/pipelines/${id}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(id);
  });

  it('GET /api/pipelines/:id/with-populate should return populated pipeline', async () => {
    const id = '123';
    const res = await request(app).get(`/api/pipelines/${id}/with-populate`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(id);
    expect(res.body.populated).toBe(true);
  });

  it('PUT /api/pipelines/:id should update pipeline', async () => {
    const id = '123';
    const res = await request(app).put(`/api/pipelines/${id}`).send({ name: 'updated' });
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(id);
    expect(res.body.updated).toBe(true);
  });

  it('PATCH /api/pipelines/:id/field should update field', async () => {
    const id = '123';
    const res = await request(app).patch(`/api/pipelines/${id}/field`).send({ field: 'name', value: 'new' });
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(id);
    expect(res.body.fieldUpdated).toBe(true);
  });

  it('DELETE /api/pipelines/:id should delete pipeline', async () => {
    const id = '123';
    const res = await request(app).delete(`/api/pipelines/${id}`);
    expect(res.status).toBe(204);
  });
});

describe('ConnectionConfig API routes', () => {
  it('GET /api/pipelines/connection-configs should return all configs', async () => {
    const res = await request(app).get('/api/pipelines/connection-configs');
    expect(res.status).toBe(200);
  });

  it('GET /api/pipelines/connection-configs/:id should return a config', async () => {
    const id = 'abc';
    const res = await request(app).get(`/api/pipelines/connection-configs/${id}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(id);
  });

  it('POST /api/pipelines/connection-configs should create config', async () => {
    const res = await request(app).post('/api/pipelines/connection-configs').send({ name: 'conn' });
    expect(res.status).toBe(201);
    expect(res.body.message).toBe('conn createIfNotExist called');
  });

  it('PUT /api/pipelines/connection-configs/:id should update config', async () => {
    const id = 'abc';
    const res = await request(app).put(`/api/pipelines/connection-configs/${id}`).send({ name: 'updated' });
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(id);
    expect(res.body.updated).toBe(true);
  });

  it('DELETE /api/pipelines/connection-configs/:id should delete config', async () => {
    const id = 'abc';
    const res = await request(app).delete(`/api/pipelines/connection-configs/${id}`);
    expect(res.status).toBe(204);
  });
});
