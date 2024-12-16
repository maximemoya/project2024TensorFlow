import React, { useState, useCallback } from 'react';
import { useTrainingSet } from '../hooks/useTrainingSet';
import { config } from '../config';

function TrainingSetPage() {
  const {
    trainingSets,
    selectedSets,
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

  const validateFiles = useCallback((files: FileList): string | null => {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Check file type
      if (!config.ALLOWED_FILE_TYPES.includes(file.type)) {
        return `File "${file.name}" has an unsupported type. Allowed types: ${config.ALLOWED_FILE_TYPES.join(', ')}`;
      }
      
      // Check file size
      if (file.size > config.MAX_FILE_SIZE) {
        return `File "${file.name}" is too large. Maximum size is ${config.MAX_FILE_SIZE / 1024 / 1024}MB`;
      }
    }
    return null;
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const error = validateFiles(files);
    if (error) {
      setCreateError(error);
      e.target.value = ''; // Reset input
      return;
    }

    setSelectedFiles(files);
    setCreateError(null);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    setUploadProgress(0);

    if (!newSetName.trim()) {
      setCreateError('Please provide a name for the training set');
      return;
    }

    if (!selectedFiles || selectedFiles.length === 0) {
      setCreateError('Please select at least one file');
      return;
    }

    try {
      setIsCreating(true);

      // Create training set
      const trainingSet = await createTrainingSet({
        name: newSetName,
        description: newSetDescription
      });

      // Upload files
      const formData = new FormData();
      for (let i = 0; i < selectedFiles.length; i++) {
        formData.append('images', selectedFiles[i]);
      }

      await fetch(`${config.API_URL}/training-sets/${trainingSet.id}/images`, {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      // Reset form
      setNewSetName('');
      setNewSetDescription('');
      setSelectedFiles(null);
      setUploadProgress(0);
      
      // Reset file input
      const fileInput = document.querySelector<HTMLInputElement>('input[type="file"]');
      if (fileInput) fileInput.value = '';

    } catch (error: any) {
      setCreateError(error.message || 'Failed to create training set');
    } finally {
      setIsCreating(false);
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
            className={`p-6 rounded-lg shadow-md relative ${
              selectedSets.has(set.id) ? 'bg-green-50 border-2 border-green-500' : 'bg-white'
            }`}
          >
            {selectedSets.has(set.id) && (
              <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded-full text-sm">
                Selected
              </div>
            )}
            <h3 className="text-xl font-semibold mb-2">{set.name}</h3>
            {set.description && <p className="text-gray-600 mb-4">{set.description}</p>}
            <p className="text-sm text-gray-500 mb-4">
              Created: {new Date(set.createdAt).toLocaleDateString()}
            </p>
            <div className="flex justify-between items-center">
              <button
                onClick={() => selectTrainingSet(set.id)}
                className={`px-4 py-2 rounded ${
                  selectedSets.has(set.id)
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : 'bg-green-500 hover:bg-green-600 text-white'
                }`}
              >
                {selectedSets.has(set.id) ? 'Deselect' : 'Select'}
              </button>
              <button
                onClick={() => deleteTrainingSet(set.id)}
                className="text-red-500 hover:text-red-700"
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
