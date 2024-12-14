import request from 'supertest';
import { app } from '../../app';
import { describe, expect, it } from '@jest/globals';
import type { Model } from '../../services/model.service';

describe('Model Routes', () => {
  describe('POST /api/models', () => {
    it('should create a new model with valid configuration', async () => {
      const modelConfig = {
        name: 'Test Model',
        description: 'A test model',
        layers: [
          {
            type: 'dense' as const,
            units: 64,
            activation: 'relu' as const,
            inputShape: [28, 28, 1]
          },
          {
            type: 'dense' as const,
            units: 10,
            activation: 'softmax' as const
          }
        ]
      };

      const response = await request(app)
        .post('/api/models')
        .send(modelConfig)
        .expect(201);

      expect(response.body).toMatchObject({
        name: modelConfig.name,
        description: modelConfig.description,
        layers: modelConfig.layers,
      });
      expect(response.body.id).toBeDefined();
      expect(response.body.createdAt).toBeDefined();
      expect(response.body.updatedAt).toBeDefined();
    });

    it('should validate layer configurations', async () => {
      const invalidModelConfig = {
        name: 'Invalid Model',
        layers: [
          {
            type: 'unknown_layer',
            units: 64
          }
        ]
      };

      const response = await request(app)
        .post('/api/models')
        .send(invalidModelConfig)
        .expect(400);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('GET /api/models', () => {
    it('should return list of models', async () => {
      const response = await request(app)
        .get('/api/models')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      if (response.body.length > 0) {
        expect(response.body[0]).toMatchObject({
          id: expect.any(String),
          name: expect.any(String),
          layers: expect.any(Array),
          createdAt: expect.any(String),
          updatedAt: expect.any(String)
        });
      }
    });
  });

  describe('GET /api/models/:id', () => {
    it('should return a specific model', async () => {
      // First create a model
      const modelConfig = {
        name: 'Test Model for Get',
        layers: [
          {
            type: 'dense' as const,
            units: 64,
            activation: 'relu' as const,
            inputShape: [28, 28, 1]
          }
        ]
      };

      const createResponse = await request(app)
        .post('/api/models')
        .send(modelConfig)
        .expect(201);

      const modelId = createResponse.body.id;

      // Then get the model
      const getResponse = await request(app)
        .get(`/api/models/${modelId}`)
        .expect(200);

      expect(getResponse.body).toMatchObject({
        id: modelId,
        name: modelConfig.name,
        layers: modelConfig.layers
      });
    });

    it('should return 404 for non-existent model', async () => {
      const response = await request(app)
        .get('/api/models/nonexistent-id')
        .expect(404);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('POST /api/models/:id/train', () => {
    it('should train a model', async () => {
      // First create a model
      const modelConfig = {
        name: 'Test Model for Training',
        layers: [
          {
            type: 'dense' as const,
            units: 64,
            activation: 'relu' as const,
            inputShape: [28, 28, 1]
          },
          {
            type: 'dense' as const,
            units: 10,
            activation: 'softmax' as const
          }
        ]
      };

      const createResponse = await request(app)
        .post('/api/models')
        .send(modelConfig)
        .expect(201);

      const modelId = createResponse.body.id;

      const trainingConfig = {
        trainingSetIds: ['training-set-1'],
        epochs: 1,
        batchSize: 32
      };

      const response = await request(app)
        .post(`/api/models/${modelId}/train`)
        .send(trainingConfig)
        .expect(200);

      expect(response.body).toMatchObject({
        modelId: modelId,
        status: expect.stringMatching(/^(completed|failed)$/),
        metrics: expect.objectContaining({
          accuracy: expect.any(Number),
          loss: expect.any(Number)
        })
      });
    });
  });
});
