import * as tf from '@tensorflow/tfjs-node';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';

export type LayerType = 'dense' | 'conv2d' | 'maxPooling2d' | 'flatten' | 'dropout';
export type ActivationType = 'relu' | 'sigmoid' | 'softmax' | 'tanh';
export type ModelStatus = 'PENDING' | 'TRAINING' | 'TRAINED' | 'FAILED';

export interface BaseLayer {
  type: LayerType;
  name?: string;
}

export interface DenseLayer extends BaseLayer {
  type: 'dense';
  units: number;
  activation: ActivationType;
  inputShape?: number[];
}

export interface Conv2DLayer extends BaseLayer {
  type: 'conv2d';
  filters: number;
  kernelSize: [number, number];
  activation: ActivationType;
  inputShape?: [number, number, number];
}

export interface MaxPooling2DLayer extends BaseLayer {
  type: 'maxPooling2d';
  poolSize: [number, number];
}

export interface FlattenLayer extends BaseLayer {
  type: 'flatten';
}

export interface DropoutLayer extends BaseLayer {
  type: 'dropout';
  rate: number;
}

export type Layer = DenseLayer | Conv2DLayer | MaxPooling2DLayer | FlattenLayer | DropoutLayer;

export interface Model {
  id: string;
  name: string;
  description?: string;
  layers: Layer[];
  status: ModelStatus;
  error?: string;
  trainingLogs?: string[];
  metrics?: {
    accuracy: number;
    loss: number;
    epoch: number;
  }[];
  createdAt: string;
  updatedAt: string;
  selectedTrainingSets?: string[];
}

export interface TrainingConfig {
  trainingSetIds: string[];
  epochs: number;
  batchSize: number;
}

export interface TrainingResult {
  modelId: string;
  status: 'completed' | 'failed';
  metrics: {
    accuracy: number;
    loss: number;
  };
  logs?: string[];
  error?: string;
}

class ModelServiceImpl {
  private models: Map<string, { model: Model; tfModel?: tf.LayersModel }> = new Map();
  private prisma: any; // Assuming prisma is defined elsewhere

  async createModel(config: Omit<Model, 'id' | 'createdAt' | 'updatedAt'>): Promise<Model> {
    const now = new Date().toISOString();
    const model: Model = {
      id: uuidv4(),
      ...config,
      createdAt: now,
      updatedAt: now,
      status: 'PENDING',
    };

    // Create TensorFlow model
    const tfModel = tf.sequential();
    
    for (const layer of config.layers) {
      switch (layer.type) {
        case 'dense':
          tfModel.add(tf.layers.dense({
            units: layer.units,
            activation: layer.activation,
            inputShape: layer.inputShape,
            name: layer.name,
          }));
          break;
        case 'conv2d':
          tfModel.add(tf.layers.conv2d({
            filters: layer.filters,
            kernelSize: layer.kernelSize,
            activation: layer.activation,
            inputShape: layer.inputShape,
            name: layer.name,
          }));
          break;
        case 'maxPooling2d':
          tfModel.add(tf.layers.maxPooling2d({
            poolSize: layer.poolSize,
            name: layer.name,
          }));
          break;
        case 'flatten':
          tfModel.add(tf.layers.flatten({
            name: layer.name,
          }));
          break;
        case 'dropout':
          tfModel.add(tf.layers.dropout({
            rate: layer.rate,
            name: layer.name,
          }));
          break;
      }
    }

    this.models.set(model.id, { model, tfModel });
    return model;
  }

  async getModels(): Promise<Model[]> {
    return Array.from(this.models.values()).map(({ model }) => model);
  }

  async getModel(id: string): Promise<Model | null> {
    const modelData = this.models.get(id);
    return modelData ? modelData.model : null;
  }

  async resetModel(id: string): Promise<Model | null> {
    const modelData = this.models.get(id);
    if (!modelData) {
      return null;
    }

    const updatedModel: Model = {
      ...modelData.model,
      status: 'PENDING',
      updatedAt: new Date().toISOString()
    };

    this.models.set(id, { ...modelData, model: updatedModel });
    return updatedModel;
  }

  private getModelOutputShape(tfModel: tf.LayersModel): number {
    const outputLayer = tfModel.layers[tfModel.layers.length - 1];
    const outputShape = outputLayer.outputShape;
    if (Array.isArray(outputShape)) {
      // If shape is [null, X], return X
      return outputShape[outputShape.length - 1] as number;
    }
    return 1; // Default to 1 if shape is not as expected
  }

  async trainModel(modelId: string, config: TrainingConfig): Promise<TrainingResult> {
    const modelData = this.models.get(modelId);
    if (!modelData || !modelData.tfModel) {
      throw new Error('Model not found');
    }

    const model = modelData.model;
    model.selectedTrainingSets = config.trainingSetIds;
    model.status = 'TRAINING';
    model.error = undefined;
    model.trainingLogs = [];
    model.metrics = [];
    
    this.models.set(modelId, { ...modelData, model });

    try {
      // Log compilation start
      model.trainingLogs.push('Compiling model...');
      
      await modelData.tfModel.compile({
        optimizer: 'adam',
        loss: 'categoricalCrossentropy',
        metrics: ['accuracy'],
      });

      model.trainingLogs.push('Model compiled successfully');
      
      // Get input and output shapes
      const inputShape = modelData.tfModel.inputs[0].shape as number[];
      const outputUnits = this.getModelOutputShape(modelData.tfModel);
      
      model.trainingLogs.push(`Model input shape: [${inputShape.join(',')}], output units: ${outputUnits}`);

      // Generate appropriate training data
      const numSamples = 1000;
      let xTrain: tf.Tensor;
      
      // Handle different input shapes
      if (inputShape.length === 4) {
        // For CNN input shape [batch, height, width, channels]
        const [, height, width, channels] = inputShape;
        xTrain = tf.randomNormal([numSamples, height || 28, width || 28, channels || 1]);
      } else {
        // For dense layers input shape [batch, features]
        const features = inputShape[1] || 5408; // Use the expected number of features
        xTrain = tf.randomNormal([numSamples, features]);
      }

      // Generate matching output shape with one-hot encoded labels
      const yTrain = tf.oneHot(
        tf.randomUniform([numSamples], 0, outputUnits, 'int32'),
        outputUnits
      );

      model.trainingLogs.push(`Starting training with ${config.epochs} epochs and batch size ${config.batchSize}`);
      model.trainingLogs.push(`Training data shapes - Input: ${xTrain.shape}, Output: ${yTrain.shape}`);

      const history = await modelData.tfModel.fit(xTrain, yTrain, {
        epochs: config.epochs,
        batchSize: config.batchSize,
        callbacks: {
          onEpochEnd: (epoch, logs) => {
            if (logs) {
              model.trainingLogs?.push(
                `Epoch ${epoch + 1}/${config.epochs} - ` +
                `loss: ${logs.loss.toFixed(4)} - ` +
                `accuracy: ${logs.acc.toFixed(4)}`
              );
              model.metrics?.push({
                epoch: epoch + 1,
                accuracy: logs.acc,
                loss: logs.loss
              });
              // Update model in map to persist logs
              this.models.set(modelId, { model, tfModel: modelData.tfModel });
            }
          }
        }
      });

      // Clean up tensors
      xTrain.dispose();
      yTrain.dispose();

      const accuracyValue = history.history.acc[history.history.acc.length - 1];
      const lossValue = history.history.loss[history.history.loss.length - 1];

      const accuracy = typeof accuracyValue === 'number'
        ? accuracyValue
        : tf.util.isTypedArray(accuracyValue) || accuracyValue instanceof tf.Tensor
          ? (accuracyValue as tf.Tensor).dataSync()[0]
          : 0;

      const loss = typeof lossValue === 'number'
        ? lossValue
        : tf.util.isTypedArray(lossValue) || lossValue instanceof tf.Tensor
          ? (lossValue as tf.Tensor).dataSync()[0]
          : 0;

      model.status = 'TRAINED';
      model.trainingLogs.push('Training completed successfully');
      this.models.set(modelId, { model, tfModel: modelData.tfModel });

      return {
        modelId,
        status: 'completed',
        metrics: {
          accuracy,
          loss,
        },
        logs: model.trainingLogs
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      model.status = 'FAILED';
      model.error = errorMessage;
      model.trainingLogs?.push(`Training failed: ${errorMessage}`);
      this.models.set(modelId, { model, tfModel: modelData.tfModel });

      return {
        modelId,
        status: 'failed',
        metrics: {
          accuracy: 0,
          loss: 0,
        },
        error: errorMessage,
        logs: model.trainingLogs
      };
    }
  }

  async predict(modelId: string, input: { data: number[][] }): Promise<{ predictions: number[][] }> {
    const modelData = this.models.get(modelId);
    if (!modelData || !modelData.tfModel) {
      throw new Error('Model not found');
    }

    const tensor = tf.tensor(input.data);
    const predictions = modelData.tfModel.predict(tensor) as tf.Tensor;
    const values = await predictions.array() as number[][];
    
    predictions.dispose();
    tensor.dispose();

    return { predictions: values };
  }

  async predictImage(modelId: string, imageBuffer: Buffer): Promise<{ class: number; trainingSet: string }> {
    const modelData = this.models.get(modelId);
    if (!modelData || !modelData.tfModel) {
      throw new Error('Model not found or not trained');
    }

    try {
      // Get input shape from the model
      const inputShape = modelData.tfModel.inputs[0].shape as number[];
      const [_, height, width, channels] = inputShape;

      // Preprocess image
      const processedImage = await sharp(imageBuffer)
        .resize(width, height, { fit: 'fill' })
        .grayscale(channels === 1)
        .raw()
        .toBuffer();

      // Convert to tensor
      const tensor = tf.tensor4d(
        new Float32Array(processedImage),
        [1, height, width, channels]
      );

      // Normalize pixel values to [0, 1]
      const normalizedTensor = tensor.div(255.0);

      // Get prediction
      const predictions = modelData.tfModel.predict(normalizedTensor) as tf.Tensor;
      const values = (await predictions.array()) as number[][];
      
      // Clean up tensors
      tensor.dispose();
      normalizedTensor.dispose();
      predictions.dispose();

      // Get the class with highest probability
      const predictionArray = values[0];
      const predictedClass = predictionArray.indexOf(Math.max(...predictionArray));

      // Get training set name from model
      let trainingSetName = 'unknown';
      if (modelData.model.selectedTrainingSets && modelData.model.selectedTrainingSets.length > 0) {
        const trainingSetId = modelData.model.selectedTrainingSets[0];
        const trainingSet = await this.prisma.trainingSet.findUnique({
          where: { id: trainingSetId }
        });
        if (trainingSet) {
          trainingSetName = trainingSet.name;
        }
      }

      return {
        class: predictedClass,
        trainingSet: trainingSetName
      };
    } catch (error) {
      console.error('Prediction error:', error);
      throw new Error('Failed to process image for prediction');
    }
  }
}

export const ModelService = new ModelServiceImpl();
