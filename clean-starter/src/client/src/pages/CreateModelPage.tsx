import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTrainingSet } from '../hooks/useTrainingSet';

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

    try {
      const response = await fetch('http://localhost:3000/api/models', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          description,
          layers,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || 'Failed to create model');
      }

      const model = await response.json();
      
      // If training sets are selected, start training
      if (selectedSets.size > 0) {
        const trainingResponse = await fetch(`http://localhost:3000/api/models/${model.id}/train`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            trainingSetIds: Array.from(selectedSets),
            epochs: 10,
            batchSize: 32,
          }),
        });

        if (!trainingResponse.ok) {
          throw new Error('Failed to start training');
        }
      }

      navigate('/models');
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Create New Model</h1>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            rows={3}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-4">Layers</label>
          
          <div className="space-y-4">
            {layers.map((layer, index) => (
              <div key={index} className="border rounded-lg p-4 bg-gray-50">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium">Layer {index + 1}: {layer.type}</h3>
                  <button
                    type="button"
                    onClick={() => removeLayer(index)}
                    className="text-red-600 hover:text-red-800"
                  >
                    Remove
                  </button>
                </div>

                {layer.type === 'dense' && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Units</label>
                        <input
                          type="number"
                          value={layer.units}
                          onChange={(e) => updateLayer(index, { units: parseInt(e.target.value) })}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Activation</label>
                        <select
                          value={layer.activation}
                          onChange={(e) => updateLayer(index, { activation: e.target.value as Layer['activation'] })}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        >
                          {ACTIVATIONS.map(activation => (
                            <option key={activation} value={activation}>{activation}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    {index === 0 && (
                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700">Input Shape</label>
                        <input
                          type="text"
                          value={layer.inputShape?.join(',')}
                          onChange={(e) => updateLayer(index, { inputShape: e.target.value.split(',').map(Number) })}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                          placeholder="e.g., 28,28,1"
                          required
                        />
                      </div>
                    )}
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
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Kernel Size</label>
                      <input
                        type="text"
                        value={layer.kernelSize?.join(',')}
                        onChange={(e) => updateLayer(index, { kernelSize: e.target.value.split(',').map(Number) })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
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
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
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
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      step="0.1"
                      min="0"
                      max="1"
                      required
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Add Layer</label>
            <div className="flex gap-2">
              {LAYER_TYPES.map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => addLayer(type)}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Add {type}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="inline-flex items-center px-4 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Create Model {selectedSets.size > 0 && 'and Start Training'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default CreateModelPage;
