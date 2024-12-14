import { useState, useEffect } from 'react';
import axios from 'axios';

interface TrainingSet {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  isSelected: boolean;
  dataPath: string;
}

interface CreateTrainingSetDTO {
  name: string;
  description?: string;
}

export function useTrainingSet() {
  const [trainingSets, setTrainingSets] = useState<TrainingSet[]>([]);
  const [selectedSet, setSelectedSet] = useState<TrainingSet | null>(null);
  const [selectedSets, setSelectedSets] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTrainingSets = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get<TrainingSet[]>('/api/training-sets');
      setTrainingSets(response.data);
      const selected = response.data.find(set => set.isSelected);
      setSelectedSet(selected || null);
      // Initialize selectedSets with any pre-selected sets
      setSelectedSets(new Set(response.data.filter(set => set.isSelected).map(set => set.id)));
    } catch (err: any) {
      console.error('Error fetching training sets:', err);
      setError(err.response?.data?.error || 'Failed to fetch training sets');
      setTrainingSets([]);
    } finally {
      setLoading(false);
    }
  };

  const createTrainingSet = async (data: CreateTrainingSetDTO) => {
    try {
      setError(null);
      const response = await axios.post<TrainingSet>('/api/training-sets', data);
      setTrainingSets(prev => [...prev, response.data]);
      return response.data;
    } catch (err: any) {
      console.error('Error creating training set:', err);
      setError(err.response?.data?.error || 'Failed to create training set');
      throw err;
    }
  };

  const deleteTrainingSet = async (id: string) => {
    try {
      setError(null);
      await axios.delete(`/api/training-sets/${id}`);
      setTrainingSets(prev => prev.filter(set => set.id !== id));
      if (selectedSet?.id === id) {
        setSelectedSet(null);
      }
      setSelectedSets(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    } catch (err: any) {
      console.error('Error deleting training set:', err);
      setError(err.response?.data?.error || 'Failed to delete training set');
      throw err;
    }
  };

  const selectTrainingSet = async (id: string) => {
    try {
      setError(null);
      const response = await axios.post<TrainingSet>(`/api/training-sets/${id}/select`);
      
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

      return response.data;
    } catch (err: any) {
      console.error('Error selecting training set:', err);
      setError(err.response?.data?.error || 'Failed to select training set');
      throw err;
    }
  };

  useEffect(() => {
    fetchTrainingSets();
  }, []);

  return {
    trainingSets,
    selectedSet,
    selectedSets,
    loading,
    error,
    createTrainingSet,
    deleteTrainingSet,
    selectTrainingSet,
    fetchTrainingSets
  };
}
