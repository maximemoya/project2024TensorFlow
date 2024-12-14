import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';

interface TrainingSet {
  id: string;
  name: string;
  description: string;
  images: string[];
  createdAt: string;
  updatedAt: string;
}

interface CreateTrainingSetData {
  name: string;
  description: string;
}

export function useTrainingSet() {
  const auth = useAuth();
  const token = auth?.token;
  const [trainingSets, setTrainingSets] = useState<TrainingSet[]>([]);
  const [selectedSet, setSelectedSet] = useState<TrainingSet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all training sets
  const fetchTrainingSets = async () => {
    if (!token) {
      setError('No authentication token found');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/training-sets', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch training sets');
      }

      const data = await response.json();
      setTrainingSets(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Create a new training set
  const createTrainingSet = async (data: CreateTrainingSetData) => {
    if (!token) {
      throw new Error('No authentication token found');
    }

    try {
      const response = await fetch('/api/training-sets', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to create training set');
      }

      await fetchTrainingSets();
    } catch (err: any) {
      throw new Error(err.message);
    }
  };

  // Delete a training set
  const deleteTrainingSet = async (id: string) => {
    if (!token) {
      setError('No authentication token found');
      return;
    }

    try {
      const response = await fetch(`/api/training-sets/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete training set');
      }

      await fetchTrainingSets();
      if (selectedSet?.id === id) {
        setSelectedSet(null);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Select a training set
  const selectTrainingSet = async (id: string) => {
    if (!token) {
      setError('No authentication token found');
      return;
    }

    try {
      const response = await fetch(`/api/training-sets/${id}/select`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to select training set');
      }

      const selectedTrainingSet = trainingSets.find(set => set.id === id);
      if (selectedTrainingSet) {
        setSelectedSet(selectedTrainingSet);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  useEffect(() => {
    if (token) {
      fetchTrainingSets();
    }
  }, [token]);

  return {
    trainingSets,
    selectedSet,
    loading,
    error,
    createTrainingSet,
    deleteTrainingSet,
    selectTrainingSet,
  };
}
