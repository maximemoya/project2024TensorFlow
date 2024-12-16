import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTrainingSet } from '../hooks/useTrainingSet';
import axios from 'axios';
import { config } from '../config';

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

const LAYER_TYPES = ['dense', 'conv2d', 'maxPooling2d', 'flatten', 'dropout'] as const;
const ACTIVATIONS = ['relu', 'sigmoid', 'softmax', 'tanh'] as const;

function CreateModelPage() {
  const navigate = useNavigate();
  const { selectedSets } = useTrainingSet();
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [layers, setLayers] = useState<Layer[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addLayer = (type: Layer['type']) => {
    const newLayer: Layer = { type };
    
    // Set default values based on layer type
    switch (type) {
      case 'dense':
        newLayer.units = 64;
        newLayer.activation = 'relu';
        if (layers.length === 0) {
          newLayer.inputShape = [28, 28, 1]; // Example for MNIST
        }
        break;
      case 'conv2d':
        newLayer.filters = 32;
        newLayer.kernelSize = [3, 3];
        newLayer.activation = 'relu';
        if (layers.length === 0) {
          newLayer.inputShape = [28, 28, 1];
        }
        break;
      case 'maxPooling2d':
        newLayer.poolSize = [2, 2];
        break;
      case 'dropout':
        newLayer.rate = 0.5;
        break;
    }

    setLayers([...layers, newLayer]);
  };

  const updateLayer = (index: number, updates: Partial<Layer>) => {
    const newLayers = [...layers];
    newLayers[index] = { ...newLayers[index], ...updates };
    setLayers(newLayers);
  };

  const removeLayer = (index: number) => {
    setLayers(layers.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      // Create the model
      const modelResponse = await axios.post(
        `${config.API_URL}/models`,
        {
          name,
          description,
          layers,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      const model = modelResponse.data;
      
      // If training sets are selected, start training
      if (selectedSets.size > 0) {
        await axios.post(
          `${config.API_URL}/models/${model.id}/train`,
          {
            trainingSetIds: Array.from(selectedSets),
            epochs: 10,
            batchSize: 32
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          }
        );
      }

      navigate(`/models/${model.id}`);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.error || err.response?.data?.message || 'Failed to create model');
      } else {
        setError('An unexpected error occurred');
      }
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow-sm rounded-lg p-6">
          <h1 className="text-2xl font-bold mb-6">Create New Model</h1>
          
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded text-red-600">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Name
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Description
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  rows={3}
                />
              </label>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-2">Layers</h3>
              <div className="space-y-4">
                {layers.map((layer, index) => (
                  <div key={index} className="p-4 border rounded-md relative">
                    <button
                      type="button"
                      onClick={() => removeLayer(index)}
                      className="absolute top-2 right-2 text-red-500 hover:text-red-700"
                    >
                      Remove
                    </button>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Layer specific inputs based on type */}
                      {layer.type === 'dense' && (
                        <>
                          <div>
                            <label className="block text-sm font-medium text-gray-700">
                              Units
                              <input
                                type="number"
                                value={layer.units}
                                onChange={(e) => updateLayer(index, { units: parseInt(e.target.value) })}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                required
                              />
                            </label>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700">
                              Activation
                              <select
                                value={layer.activation}
                                onChange={(e) => updateLayer(index, { activation: e.target.value as Layer['activation'] })}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                required
                              >
                                {ACTIVATIONS.map((activation) => (
                                  <option key={activation} value={activation}>
                                    {activation}
                                  </option>
                                ))}
                              </select>
                            </label>
                          </div>
                        </>
                      )}
                      
                      {layer.type === 'conv2d' && (
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Filters</label>
                            <input
                              type="number"
                              value={layer.filters}
                              onChange={(e) => updateLayer(index, { filters: parseInt(e.target.value) })}
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Kernel Size</label>
                            <input
                              type="text"
                              value={layer.kernelSize?.join(',')}
                              onChange={(e) => updateLayer(index, { kernelSize: e.target.value.split(',').map(Number) })}
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                              placeholder="e.g., 3,3"
                              required
                            />
                          </div>
                        </div>
                      )}

                      {layer.type === 'maxPooling2d' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Pool Size</label>
                          <input
                            type="text"
                            value={layer.poolSize?.join(',')}
                            onChange={(e) => updateLayer(index, { poolSize: e.target.value.split(',').map(Number) })}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            placeholder="e.g., 2,2"
                            required
                          />
                        </div>
                      )}

                      {layer.type === 'dropout' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Rate</label>
                          <input
                            type="number"
                            value={layer.rate}
                            onChange={(e) => updateLayer(index, { rate: parseFloat(e.target.value) })}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            step="0.1"
                            min="0"
                            max="1"
                            required
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Add Layer
                  </label>
                  <div className="flex gap-2">
                    {LAYER_TYPES.map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => addLayer(type)}
                        className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-4">
              <button
                type="button"
                onClick={() => navigate('/models')}
                className="px-4 py-2 text-gray-700 hover:text-gray-900"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || layers.length === 0}
                className={`px-4 py-2 rounded text-white ${
                  isSubmitting || layers.length === 0
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-500 hover:bg-blue-600'
                }`}
              >
                {isSubmitting ? 'Creating...' : 'Create Model'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default CreateModelPage;
