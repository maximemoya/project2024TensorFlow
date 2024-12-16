import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { config } from '../config';
import type { Model } from '../../../server/src/services/model.service';
import { TrainingSetSelectionModal } from '../components/TrainingSetSelectionModal';
import { useState } from 'react';

const getStatusColor = (status: string) => {
  switch (status) {
    case 'PENDING':
      return 'bg-gray-500';
    case 'TRAINING':
      return 'bg-yellow-500';
    case 'TRAINED':
      return 'bg-green-500';
    case 'FAILED':
      return 'bg-red-500';
    default:
      return 'bg-gray-500';
  }
};

function ModelPage() {
  const queryClient = useQueryClient();
  const [modalState, setModalState] = useState<{ isOpen: boolean; modelId: string | null }>({
    isOpen: false,
    modelId: null
  });
  
  const { data: models, isLoading, error } = useQuery<Model[]>({
    queryKey: ['models'],
    queryFn: async () => {
      try {
        const response = await axios.get(`${config.API_URL}/models`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        return response.data;
      } catch (error) {
        if (axios.isAxiosError(error)) {
          if (error.response?.status === 404 || error.response?.status === 204) {
            return [];
          }
          throw new Error(error.response?.data?.error || error.message || 'Failed to load models');
        }
        throw new Error('An unexpected error occurred');
      }
    },
    retry: false,
    refetchInterval: (data) => {
      return Array.isArray(data) && data.some(model => model.status === 'TRAINING') ? 5000 : false;
    },
  });

  const trainModelMutation = useMutation({
    mutationFn: async (params: { modelId: string, trainingSetIds: string[] }) => {
      const response = await axios.post(`${config.API_URL}/models/${params.modelId}/train`, {
        trainingSetIds: params.trainingSetIds,
        epochs: 10,
        batchSize: 32
      }, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['models'] });
    },
    onError: (error) => {
      if (axios.isAxiosError(error)) {
        const errorMessage = error.response?.data?.error || error.response?.data?.message || 'Failed to start training';
        alert(`Training failed: ${errorMessage}`);
      } else {
        alert('An unexpected error occurred during training');
      }
    },
  });

  const handleTrainModel = (modelId: string) => {
    const model = models?.find(m => m.id === modelId);
    setModalState({ isOpen: true, modelId });
  };

  const handleConfirmTraining = (selectedSets: string[]) => {
    if (!modalState.modelId) return;
    
    trainModelMutation.mutate({ 
      modelId: modalState.modelId, 
      trainingSetIds: selectedSets 
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 py-6 flex flex-col items-center justify-center">
        <div className="text-xl">Loading models...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 py-6 flex flex-col items-center justify-center">
        <div className="text-xl text-red-500">Error loading models</div>
        <div className="mt-2 text-gray-600">{error instanceof Error ? error.message : 'Unknown error'}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Models</h1>
          <Link
            to="/models/create"
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Create New Model
          </Link>
        </div>

        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {models?.map((model) => (
              <li key={model.id}>
                <div className="px-4 py-4 flex items-center justify-between sm:px-6">
                  <div className="flex-1 min-w-0">
                    <Link
                      to={`/models/${model.id}`}
                      className="text-lg font-medium text-blue-600 hover:text-blue-800"
                    >
                      {model.name}
                    </Link>
                    <div className="mt-1">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(model.status)} text-white`}>
                        {model.status}
                      </span>
                      {model.error && (
                        <span className="ml-2 text-sm text-red-500">
                          {typeof model.error === 'string' ? model.error : 'An error occurred'}
                        </span>
                      )}
                    </div>
                    {model.trainingLogs && model.trainingLogs.length > 0 && (
                      <div className="mt-2 text-sm text-gray-500">
                        Latest log: {model.trainingLogs[model.trainingLogs.length - 1]}
                      </div>
                    )}
                  </div>
                  <div className="ml-4 flex-shrink-0">
                    <button
                      onClick={() => handleTrainModel(model.id)}
                      disabled={model.status === 'TRAINING'}
                      className={`ml-3 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white 
                        ${model.status === 'TRAINING'
                          ? 'bg-gray-400 cursor-not-allowed'
                          : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                    >
                      {model.status === 'TRAINING' ? 'Training...' : 'Train'}
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <TrainingSetSelectionModal
        isOpen={modalState.isOpen}
        onClose={() => setModalState({ isOpen: false, modelId: null })}
        onConfirm={handleConfirmTraining}
        initialSelected={models?.find(m => m.id === modalState.modelId)?.selectedTrainingSets}
      />
    </div>
  );
}

export default ModelPage;
