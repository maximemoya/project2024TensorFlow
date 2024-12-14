import express from 'express';
import { z } from 'zod';
import { ModelService } from '../services/model.service';

const router = express.Router();

// Validation schemas
const activationSchema = z.enum(['relu', 'sigmoid', 'softmax', 'tanh']);

const baseLayerSchema = z.object({
  name: z.string().optional(),
});

const denseLayerSchema = baseLayerSchema.extend({
  type: z.literal('dense'),
  units: z.number().int().positive(),
  activation: activationSchema,
  inputShape: z.array(z.number()).optional(),
});

const conv2dLayerSchema = baseLayerSchema.extend({
  type: z.literal('conv2d'),
  filters: z.number().int().positive(),
  kernelSize: z.tuple([z.number().int().positive(), z.number().int().positive()]),
  activation: activationSchema,
  inputShape: z.tuple([z.number(), z.number(), z.number()]).optional(),
});

const maxPooling2dLayerSchema = baseLayerSchema.extend({
  type: z.literal('maxPooling2d'),
  poolSize: z.tuple([z.number().int().positive(), z.number().int().positive()]),
});

const flattenLayerSchema = baseLayerSchema.extend({
  type: z.literal('flatten'),
});

const dropoutLayerSchema = baseLayerSchema.extend({
  type: z.literal('dropout'),
  rate: z.number().min(0).max(1),
});

const layerSchema = z.discriminatedUnion('type', [
  denseLayerSchema,
  conv2dLayerSchema,
  maxPooling2dLayerSchema,
  flattenLayerSchema,
  dropoutLayerSchema,
]);

const createModelSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  layers: z.array(layerSchema).min(1),
});

const trainingConfigSchema = z.object({
  trainingSetIds: z.array(z.string()).min(1),
  epochs: z.number().int().positive(),
  batchSize: z.number().int().positive(),
});

const predictInputSchema = z.object({
  data: z.array(z.array(z.number())).min(1),
});

// Routes
router.post('/', async (req, res) => {
  try {
    const modelConfig = createModelSchema.parse(req.body);
    const model = await ModelService.createModel(modelConfig);
    res.status(201).json(model);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

router.get('/', async (req, res) => {
  try {
    const models = await ModelService.getModels();
    res.json(models);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const model = await ModelService.getModel(req.params.id);
    if (!model) {
      res.status(404).json({ error: 'Model not found' });
      return;
    }
    res.json(model);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:id/train', async (req, res) => {
  try {
    const trainingConfig = trainingConfigSchema.parse(req.body);
    const result = await ModelService.trainModel(req.params.id, trainingConfig);
    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors });
    } else if (error instanceof Error && error.message === 'Model not found') {
      res.status(404).json({ error: 'Model not found' });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

router.post('/:id/predict', async (req, res) => {
  try {
    const input = predictInputSchema.parse(req.body);
    const predictions = await ModelService.predict(req.params.id, input);
    res.json(predictions);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors });
    } else if (error instanceof Error && error.message === 'Model not found') {
      res.status(404).json({ error: 'Model not found' });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

export default router;
