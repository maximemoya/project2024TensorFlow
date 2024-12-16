import React, { useState, useRef } from 'react';
import axios from 'axios';
import { config } from '../config';

interface Props {
  modelId: string;
}

export function ModelTestPanel({ modelId }: Props) {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [prediction, setPrediction] = useState<{ class: number; trainingSet: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      setError(null);
      setPrediction(null);

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedImage(file);
      setError(null);
      setPrediction(null);

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setError('Please drop an image file');
    }
  };

  const handlePredict = async () => {
    if (!selectedImage) return;

    setIsLoading(true);
    setError(null);

    try {
      if (!selectedImage) {
        setError('No image selected');
        return;
      }

      console.log('Selected image details:', {
        name: selectedImage.name,
        type: selectedImage.type,
        size: selectedImage.size,
        lastModified: selectedImage.lastModified
      });

      const formData = new FormData();
      formData.append('image', selectedImage, selectedImage.name);

      // Log FormData contents
      console.log('FormData entries:');
      for (const pair of formData.entries()) {
        console.log(pair[0], pair[1]);
      }

      // Let the browser set the Content-Type with boundary
      const requestConfig = {
        headers: {
          'Accept': 'application/json',
        }
      };
      console.log('Request config:', requestConfig);

      const response = await axios.post(
        `${config.API_URL}/models/${modelId}/predict-image`,
        formData,
        requestConfig
      );

      console.log('Response:', {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        data: response.data
      });

      if (response.data.error) {
        throw new Error(response.data.error);
      }

      setPrediction(response.data.prediction);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const errorData = err.response?.data?.error;
        if (Array.isArray(errorData)) {
          setError(errorData.map(e => e.message).join(', '));
        } else if (typeof errorData === 'object' && errorData !== null) {
          setError(JSON.stringify(errorData));
        } else {
          setError(errorData || err.message || 'Failed to get prediction');
        }
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setSelectedImage(null);
    setImagePreview(null);
    setPrediction(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h3 className="text-lg font-medium mb-4">Test Model</h3>

      <div
        className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        {imagePreview ? (
          <div className="space-y-4">
            <img
              src={imagePreview}
              alt="Preview"
              className="max-h-48 mx-auto"
            />
            <div className="flex justify-center gap-2">
              <button
                onClick={handlePredict}
                disabled={isLoading}
                className={`px-4 py-2 rounded text-white ${
                  isLoading
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-500 hover:bg-blue-600'
                }`}
              >
                {isLoading ? 'Processing...' : 'Get Prediction'}
              </button>
              <button
                onClick={handleReset}
                className="px-4 py-2 text-gray-700 hover:text-gray-900"
              >
                Reset
              </button>
            </div>
          </div>
        ) : (
          <div>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
              ref={fileInputRef}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 text-sm text-blue-600 hover:text-blue-700"
            >
              Select an image
            </button>
            <p className="mt-2 text-sm text-gray-500">
              or drag and drop an image here
            </p>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded text-red-600">
          {error}
        </div>
      )}

      {prediction !== null && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded">
          <h4 className="font-medium text-green-800">Prediction Result</h4>
          <p className="mt-1 text-green-700">
            Dataset: {prediction?.trainingSet}<br/>
            Class: {prediction?.class}
          </p>
        </div>
      )}
    </div>
  );
}
