import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useParams, Link } from 'react-router-dom';
import { config } from '../config';
import type { Model } from '../../../server/src/services/model.service';
import { ModelTestPanel } from '../components/ModelTestPanel';

const getStatusColor = (status: string) => {
  switch (status) {
    case 'pending':
      return 'bg-gray-500';
    case 'training':
      return 'bg-yellow-500';
    case 'completed':
      return 'bg-green-500';
    case 'failed':
      return 'bg-red-500';
    default:
      return 'bg-gray-500';
  }
};

function ModelDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data: model, isLoading, error } = useQuery<Model>({
    queryKey: ['model', id],
    queryFn: async () => {
      try {
        const response = await axios.get(`${config.API_URL}/models/${id}`);
        const modelData = response.data;

        // Fetch training set names
        if (modelData.selectedTrainingSets && modelData.selectedTrainingSets.length > 0) {
          const trainingSetPromises = modelData.selectedTrainingSets.map(async (setId: string) => {
            const trainingSetResponse = await axios.get(`${config.API_URL}/training-sets/${setId}`);
            return {
              id: setId,
              name: trainingSetResponse.data.name
            };
          });
          const trainingSets = await Promise.all(trainingSetPromises);
          modelData.trainingSets = trainingSets;
        }

        return modelData;
      } catch (error) {
        if (axios.isAxiosError(error)) {
          throw new Error(error.response?.data?.error || error.message);
        }
        throw error;
      }
    },
    retry: false,
    refetchInterval: (data) => {
      return data?.status === 'training' ? 5000 : false;
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 py-6 flex flex-col items-center justify-center">
        <div className="text-xl">Loading model details...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 py-6 flex flex-col items-center justify-center">
        <div className="text-xl text-red-500 mb-4">Error loading model details</div>
        <Link to="/models" className="text-blue-500 hover:text-blue-600">
          Back to Models
        </Link>
      </div>
    );
  }

  if (!model) {
    return (
      <div className="min-h-screen bg-gray-100 py-6 flex flex-col items-center justify-center">
        <div className="text-xl mb-4">Model not found</div>
        <Link to="/models" className="text-blue-500 hover:text-blue-600">
          Back to Models
        </Link>
      </div>
    );
  }

  const handleReset = async () => {
    try {
      await axios.post(`${config.API_URL}/models/${id}/reset`);
      // The query will automatically refetch due to the mutation
    } catch (error) {
      console.error('Failed to reset model:', error);
      alert('Failed to reset model. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-6">
      <div className="container mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold mb-2">{model.name}</h1>
              <span className={`px-3 py-1 rounded text-white text-sm ${getStatusColor(model.status)}`}>
                {model.status}
              </span>
            </div>
            <Link
              to="/models"
              className="text-blue-500 hover:text-blue-600"
            >
              Back to Models
            </Link>
          </div>

          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-2">Description</h2>
            <p className="text-gray-600">{model.description || 'No description provided'}</p>
          </div>

          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-2">Layers</h2>
            <div className="space-y-2">
              {model.layers.map((layer, index) => (
                <div key={index} className="bg-gray-50 p-3 rounded">
                  <div className="font-medium">{layer.type}</div>
                  <div className="text-sm text-gray-600">
                    {Object.entries(layer)
                      .filter(([key]) => key !== 'type')
                      .map(([key, value]) => (
                        <div key={key}>
                          {key}: {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-2">Metadata</h2>
            <div className="text-sm text-gray-600">
              <div>Created: {new Date(model.createdAt).toLocaleString()}</div>
              <div>Last Updated: {new Date(model.updatedAt).toLocaleString()}</div>
            </div>
          </div>

          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-2">Training Data</h2>
            <div className="bg-gray-50 p-4 rounded">
              {model.selectedTrainingSets && model.selectedTrainingSets.length > 0 ? (
                <div>
                  <div className="text-sm text-gray-600 mb-3">
                    Selected training sets: {model.selectedTrainingSets.length}
                  </div>
                  <div className="space-y-2">
                    {model.selectedTrainingSets?.map((set) => (
                      <div key={set} className="bg-white p-3 rounded shadow-sm">
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-medium">
                            {set}
                          </div>
                          <button 
                            className="text-blue-500 hover:text-blue-600 text-sm"
                            onClick={() => window.open(`/training-sets/${set}`, '_blank')}
                          >
                            View Details
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-gray-500">
                  No training sets selected for this model
                </div>
              )}
            </div>
          </div>

          {model.status === 'TRAINED' && (
            <ModelTestPanel modelId={model.id} />
          )}

          {model.status === 'FAILED' && (
            <button
              onClick={handleReset}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
            >
              Reset Model
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default ModelDetailPage;
