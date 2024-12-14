import { useState, useEffect } from 'react';

interface Layer {
  type: 'dense' | 'conv2d' | 'maxPooling2d' | 'flatten' | 'dropout';
  units?: number;
  activation?: 'relu' | 'sigmoid' | 'softmax' | 'tanh';
  inputShape?: number[];
  kernelSize?: number[];
  filters?: number;
  poolSize?: number[];
  rate?: number;
}

interface Model {
  id: string;
  name: string;
  description?: string;
  layers: Layer[];
  createdAt: string;
  updatedAt: string;
}

interface TrainingResult {
  modelId: string;
  status: 'completed' | 'failed';
  metrics?: {
    accuracy: number;
    loss: number;
  };
  error?: string;
}

export function useModel() {
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchModels = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/models');
      
      if (!response.ok) {
        throw new Error('Failed to fetch models');
      }

      const data = await response.json();
      setModels(data);
    } catch (err: any) {
      console.error('Error fetching models:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const createModel = async (modelData: Omit<Model, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      setError(null);
      const response = await fetch('/api/models', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(modelData),
      });

      if (!response.ok) {
        throw new Error('Failed to create model');
      }

      const newModel = await response.json();
      setModels(prev => [...prev, newModel]);
      return newModel;
    } catch (err: any) {
      console.error('Error creating model:', err);
      setError(err.message);
      throw err;
    }
  };

  const trainModel = async (modelId: string, config: {
    trainingSetIds: string[];
    epochs: number;
    batchSize: number;
    validationSplit?: number;
  }): Promise<TrainingResult> => {
    try {
      setError(null);
      const response = await fetch(`/api/models/${modelId}/train`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        throw new Error('Failed to train model');
      }

      return await response.json();
    } catch (err: any) {
      console.error('Error training model:', err);
      setError(err.message);
      throw err;
    }
  };

  const predict = async (modelId: string, data: number[][]) => {
    try {
      setError(null);
      const response = await fetch(`/api/models/${modelId}/predict`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data }),
      });

      if (!response.ok) {
        throw new Error('Failed to make prediction');
      }

      return await response.json();
    } catch (err: any) {
      console.error('Error making prediction:', err);
      setError(err.message);
      throw err;
    }
  };

  useEffect(() => {
    fetchModels();
  }, []);

  return {
    models,
    loading,
    error,
    createModel,
    trainModel,
    predict,
    refreshModels: fetchModels,
  };
}
