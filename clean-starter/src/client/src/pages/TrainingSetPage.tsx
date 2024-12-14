import React, { useState } from 'react';
import { useTrainingSet } from '../hooks/useTrainingSet';

function TrainingSetPage() {
  const {
    trainingSets,
    selectedSet,
    loading,
    error,
    createTrainingSet,
    deleteTrainingSet,
    selectTrainingSet,
  } = useTrainingSet();

  const [newSetName, setNewSetName] = useState('');
  const [newSetDescription, setNewSetDescription] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    setUploadProgress(0);

    if (!selectedFiles || selectedFiles.length === 0) {
      setCreateError('Please select at least one file');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('name', newSetName);
      formData.append('description', newSetDescription);
      
      // Append all selected files
      for (let i = 0; i < selectedFiles.length; i++) {
        formData.append('images', selectedFiles[i]);
      }

      const response = await fetch('/api/training-sets', {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to create training set');
      }

      await createTrainingSet({
        name: newSetName,
        description: newSetDescription,
      });

      setNewSetName('');
      setNewSetDescription('');
      setSelectedFiles(null);
      setIsCreating(false);
      setUploadProgress(100);
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create training set');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFiles(e.target.files);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Training Sets</h1>

      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {/* Create New Training Set Form */}
      <div className="mb-8">
        <button
          onClick={() => setIsCreating(!isCreating)}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          {isCreating ? 'Cancel' : 'Create New Training Set'}
        </button>

        {isCreating && (
          <form onSubmit={handleCreate} className="mt-4 space-y-4 bg-white p-6 rounded-lg shadow">
            {createError && (
              <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded">
                {createError}
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Name</label>
              <input
                type="text"
                value={newSetName}
                onChange={(e) => setNewSetName(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                value={newSetDescription}
                onChange={(e) => setNewSetDescription(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Images</label>
              <input
                type="file"
                onChange={handleFileChange}
                className="mt-1 block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-md file:border-0
                  file:text-sm file:font-semibold
                  file:bg-blue-50 file:text-blue-700
                  hover:file:bg-blue-100"
                multiple
                accept="image/*"
                required
              />
              {uploadProgress > 0 && (
                <div className="mt-2">
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div 
                      className="bg-blue-600 h-2.5 rounded-full" 
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>

            <button
              type="submit"
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
            >
              Create
            </button>
          </form>
        )}
      </div>

      {/* Training Sets List */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {trainingSets.map((set) => (
          <div
            key={set.id}
            className={`p-6 rounded-lg shadow-md ${
              set.isSelected ? 'bg-blue-50 border-2 border-blue-500' : 'bg-white'
            }`}
          >
            <h3 className="text-xl font-semibold mb-2">{set.name}</h3>
            {set.description && <p className="text-gray-600 mb-4">{set.description}</p>}
            <p className="text-sm text-gray-500 mb-4">
              Created: {new Date(set.createdAt).toLocaleDateString()}
            </p>
            <p className="text-sm text-gray-500 mb-4">Path: {set.dataPath}</p>
            
            <div className="flex space-x-2">
              <button
                onClick={() => selectTrainingSet(set.id)}
                className={`px-4 py-2 rounded ${
                  set.isSelected
                    ? 'bg-blue-200 text-blue-800'
                    : 'bg-blue-500 text-white hover:bg-blue-600'
                }`}
                disabled={set.isSelected}
              >
                {set.isSelected ? 'Selected' : 'Select'}
              </button>
              <button
                onClick={() => deleteTrainingSet(set.id)}
                className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {trainingSets.length === 0 && !loading && (
        <div className="text-center text-gray-500 mt-8">
          No training sets available. Create one to get started!
        </div>
      )}
    </div>
  );
}

export default TrainingSetPage;
