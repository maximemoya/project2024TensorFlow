import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { Link } from 'react-router-dom';
import type { Model } from '../../../server/src/services/model.service';

function ModelPage() {
  const { data: models, isLoading, error } = useQuery<Model[]>({
    queryKey: ['models'],
    queryFn: async () => {
      try {
        const response = await axios.get('http://localhost:3000/api/models');
        return response.data;
      } catch (error) {
        // Si l'API renvoie une liste vide ou une erreur 404, on retourne un tableau vide
        if (axios.isAxiosError(error)) {
          if (error.response?.status === 404 || error.response?.status === 204) {
            return [];
          }
          throw new Error(error.response?.data?.error || error.message);
        }
        throw error;
      }
    },
    retry: false, // Ne pas réessayer en cas d'erreur
  });

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
        <div className="text-xl text-red-500 mb-4">Error loading models</div>
        <Link
          to="/models/create"
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
        >
          Create Your First Model
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Models</h1>
          <Link
            to="/models/create"
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
          >
            Create New Model
          </Link>
        </div>

        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          {(!models || models.length === 0) ? (
            <div className="px-6 py-12 text-center">
              <h3 className="text-xl font-medium text-gray-900 mb-4">No models yet</h3>
              <p className="text-gray-500 mb-6">Create your first model to get started with training!</p>
              <Link
                to="/models/create"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                Create Your First Model
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {models.map((model) => (
                <li key={model.id} className="px-6 py-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-800">{model.name}</h2>
                      {model.description && (
                        <p className="text-gray-600 mt-1">{model.description}</p>
                      )}
                      <p className="text-sm text-gray-500 mt-1">
                        Created: {new Date(model.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex space-x-3">
                      <button
                        className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600 transition-colors"
                        onClick={() => {/* TODO: Implement training */}}
                      >
                        Train
                      </button>
                      <button
                        className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 transition-colors"
                        onClick={() => {/* TODO: Implement prediction */}}
                      >
                        Predict
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-6">
          <Link
            to="/lobby"
            className="text-blue-500 hover:text-blue-600 transition-colors"
          >
            ← Back to Lobby
          </Link>
        </div>
      </div>
    </div>
  );
}

export default ModelPage;
