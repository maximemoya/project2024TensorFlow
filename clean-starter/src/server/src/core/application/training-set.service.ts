import { PrismaClient } from '@prisma/client';
import { AppError } from '../../infrastructure/error/app-error';

export interface TrainingSet {
  id: string;
  name: string;
  description: string | null;
  isSelected: boolean;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  images: any[];
}

export interface CreateTrainingSetDTO {
  name: string;
  description?: string;
  userId: string;
}

export class TrainingSetService {
  constructor(private prisma: PrismaClient) {}

  async createTrainingSet(data: CreateTrainingSetDTO): Promise<TrainingSet> {
    try {
      console.log('Creating training set with data:', data);
      const user = await this.prisma.user.findUnique({
        where: { id: data.userId }
      });
      console.log('Found user:', user);

      if (!user) {
        throw new AppError('User not found', 404);
      }

      return await this.prisma.trainingSet.create({
        data: {
          name: data.name,
          description: data.description,
          userId: data.userId,
        },
        include: {
          images: true,
        },
      });
    } catch (error) {
      console.error('Error creating training set:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to create training set', 500);
    }
  }

  async getTrainingSets(userId: string): Promise<TrainingSet[]> {
    try {
      return await this.prisma.trainingSet.findMany({
        where: { userId },
        include: {
          images: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    } catch (error) {
      console.error('Error getting training sets:', error);
      throw new AppError('Failed to get training sets', 500);
    }
  }

  async getTrainingSetById(id: string, userId: string): Promise<TrainingSet | null> {
    try {
      return await this.prisma.trainingSet.findFirst({
        where: { id, userId },
        include: {
          images: true,
        },
      });
    } catch (error) {
      console.error('Error getting training set:', error);
      throw new AppError('Failed to get training set', 500);
    }
  }

  async addImages(id: string, userId: string, files: Express.Multer.File[]): Promise<any[]> {
    try {
      const trainingSet = await this.getTrainingSetById(id, userId);
      if (!trainingSet) {
        throw new AppError('Training set not found', 404);
      }

      const images = await Promise.all(files.map(file => 
        this.prisma.trainingImage.create({
          data: {
            filename: file.filename,
            originalName: file.originalname,
            path: file.path,
            mimetype: file.mimetype,
            size: file.size,
            trainingSetId: id
          }
        })
      ));

      return images;
    } catch (error) {
      console.error('Error adding images:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to add images', 500);
    }
  }

  async getImages(id: string, userId: string): Promise<any[]> {
    try {
      const trainingSet = await this.getTrainingSetById(id, userId);
      if (!trainingSet) {
        throw new AppError('Training set not found', 404);
      }

      return await this.prisma.trainingImage.findMany({
        where: { trainingSetId: id }
      });
    } catch (error) {
      console.error('Error getting images:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to get images', 500);
    }
  }

  async selectTrainingSet(id: string, userId: string): Promise<TrainingSet> {
    try {
      const trainingSet = await this.getTrainingSetById(id, userId);
      if (!trainingSet) {
        throw new AppError('Training set not found', 404);
      }

      // Unselect all other training sets
      await this.prisma.trainingSet.updateMany({
        where: { userId },
        data: { isSelected: false }
      });

      // Select the current training set
      return await this.prisma.trainingSet.update({
        where: { id },
        data: { isSelected: true },
        include: { images: true }
      });
    } catch (error) {
      console.error('Error selecting training set:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to select training set', 500);
    }
  }

  async deleteTrainingSet(id: string, userId: string): Promise<void> {
    try {
      const trainingSet = await this.getTrainingSetById(id, userId);
      if (!trainingSet) {
        throw new AppError('Training set not found', 404);
      }

      // Delete all images first
      await this.prisma.trainingImage.deleteMany({
        where: { trainingSetId: id }
      });

      // Then delete the training set
      await this.prisma.trainingSet.delete({
        where: { id }
      });
    } catch (error) {
      console.error('Error deleting training set:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to delete training set', 500);
    }
  }
}
