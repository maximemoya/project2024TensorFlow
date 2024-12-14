import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';

interface TrainingSet {
  id: string;
  name: string;
  description: string;
  images: string[];
  createdAt: string;
  updatedAt: string;
  isSelected: boolean;
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
  const [selectedSets, setSelectedSets] = useState<Set<string>>(new Set());
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
      setLoading(true);
      setError(null);
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
      const selected = data.find((set: TrainingSet) => set.isSelected);
      setSelectedSet(selected || null);
      // Initialize selectedSets with any pre-selected sets
      setSelectedSets(new Set(data.filter((set: TrainingSet) => set.isSelected).map((set: TrainingSet) => set.id)));
    } catch (err: any) {
      console.error('Error fetching training sets:', err);
      setError(err.message || 'Failed to fetch training sets');
      setTrainingSets([]);
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
      const newSelectedSets = new Set(selectedSets);
      newSelectedSets.delete(id);
      setSelectedSets(newSelectedSets);
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
      setError(null);
      const response = await fetch(`/api/training-sets/${id}/select`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to select training set');
      }

      const updatedSet = await response.json();
      
      // Get the current selection state of the set
      const currentSet = trainingSets.find(set => set.id === id);
      const willBeSelected = currentSet ? !currentSet.isSelected : true;
      
      // Update training sets state
      setTrainingSets(prev =>
        prev.map(set => ({
          ...set,
          isSelected: set.id === id ? willBeSelected : set.isSelected
        }))
      );

      // Update selected set
      setSelectedSet(updatedSet);
      
      // Update selectedSets to match isSelected state
      setSelectedSets(prev => {
        const newSet = new Set(prev);
        if (willBeSelected) {
          newSet.add(id);
        } else {
          newSet.delete(id);
        }
        return newSet;
      });
    } catch (err: any) {
      console.error('Error selecting training set:', err);
      setError(err.message || 'Failed to select training set');
      throw err;
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
    selectedSets,
    loading,
    error,
    createTrainingSet,
    deleteTrainingSet,
    selectTrainingSet,
    refreshTrainingSets: fetchTrainingSets,
  };
}
