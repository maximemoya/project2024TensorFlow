import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { config } from '../config';

interface TrainingSet {
  id: string;
  name: string;
  description: string | null;
  isSelected: boolean;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  images: any[];
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selectedSets: string[]) => void;
  initialSelected?: string[];
}

export function TrainingSetSelectionModal({ isOpen, onClose, onConfirm, initialSelected = [] }: Props) {
  const [selectedSets, setSelectedSets] = useState<string[]>(initialSelected);

  const { data: trainingSets, isLoading, error } = useQuery<TrainingSet[]>({
    queryKey: ['training-sets'],
    queryFn: async () => {
      const response = await axios.get(`${config.API_URL}/training-sets`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      return response.data;
    },
    enabled: isOpen, // Only fetch when modal is open
  });

  if (!isOpen) return null;

  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
          <div className="text-red-500">Failed to load training sets</div>
          <div className="mt-4 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[80vh] flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold">Select Training Sets</h2>
        </div>

        <div className="p-4 flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="text-center py-4">Loading training sets...</div>
          ) : trainingSets?.length ? (
            <div className="space-y-2">
              {trainingSets.map((set) => (
                <label key={set.id} className="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer">
                  <input
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 rounded border-gray-300"
                    checked={selectedSets.includes(set.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedSets([...selectedSets, set.id]);
                      } else {
                        setSelectedSets(selectedSets.filter(id => id !== set.id));
                      }
                    }}
                  />
                  <div className="ml-3 flex-1">
                    <div className="font-medium">{set.name}</div>
                    {set.description && (
                      <div className="text-sm text-gray-500">{set.description}</div>
                    )}
                    <div className="text-sm text-gray-500">{set.images.length} images</div>
                  </div>
                </label>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-gray-500">
              No training sets available. Please create a training set first.
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-200 flex justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onConfirm(selectedSets);
              onClose();
            }}
            disabled={selectedSets.length === 0}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
          >
            Confirm Selection
          </button>
        </div>
      </div>
    </div>
  );
}
