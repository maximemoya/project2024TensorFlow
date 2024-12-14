import { Router } from 'express';
import { TrainingSetService } from '../../../core/application/training-set.service';
import { AuthMiddleware } from '../middleware/auth.middleware';
import { upload } from '../middleware/upload.middleware';
import { AppError } from '../../error/app-error';

export const createTrainingSetRoutes = (trainingSetService: TrainingSetService) => {
  const router = Router();

  // Créer un nouveau training set
  router.post('/', AuthMiddleware, async (req, res) => {
    try {
      const { name, description } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }

      const trainingSet = await trainingSetService.createTrainingSet({
        name,
        description,
        userId
      });

      res.status(201).json(trainingSet);
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        console.error('Error creating training set:', error);
        res.status(500).json({ error: 'Failed to create training set' });
      }
    }
  });

  // Ajouter des images à un training set
  router.post('/:id/images', AuthMiddleware, upload.array('images', 10), async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const files = req.files as Express.Multer.File[];

      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }

      if (!files || files.length === 0) {
        throw new AppError('No files uploaded', 400);
      }

      const trainingSet = await trainingSetService.getTrainingSetById(id, userId);
      if (!trainingSet) {
        throw new AppError('Training set not found', 404);
      }

      const images = await trainingSetService.addImages(id, userId, files);
      res.status(201).json(images);
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
      } else if (error instanceof Error && error.message === 'Training set not found') {
        res.status(404).json({ error: 'Training set not found' });
      } else {
        console.error('Error uploading images:', error);
        res.status(500).json({ error: 'Failed to upload images' });
      }
    }
  });

  // Récupérer les images d'un training set
  router.get('/:id/images', AuthMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }

      const trainingSet = await trainingSetService.getTrainingSetById(id, userId);
      if (!trainingSet) {
        throw new AppError('Training set not found', 404);
      }

      const images = await trainingSetService.getImages(id, userId);
      res.status(200).json(images);
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
      } else if (error instanceof Error && error.message === 'Training set not found') {
        res.status(404).json({ error: 'Training set not found' });
      } else {
        console.error('Error getting images:', error);
        res.status(500).json({ error: 'Failed to get images' });
      }
    }
  });

  // Récupérer tous les training sets d'un utilisateur
  router.get('/', AuthMiddleware, async (req, res) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }

      const trainingSets = await trainingSetService.getTrainingSets(userId);
      res.status(200).json(trainingSets);
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        console.error('Error getting training sets:', error);
        res.status(500).json({ error: 'Failed to get training sets' });
      }
    }
  });

  // Sélectionner un training set
  router.post('/:id/select', AuthMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }

      const trainingSet = await trainingSetService.getTrainingSetById(id, userId);
      if (!trainingSet) {
        throw new AppError('Training set not found', 404);
      }

      const selectedTrainingSet = await trainingSetService.selectTrainingSet(id, userId);
      res.status(200).json(selectedTrainingSet);
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
      } else if (error instanceof Error && error.message === 'Training set not found') {
        res.status(404).json({ error: 'Training set not found' });
      } else {
        console.error('Error selecting training set:', error);
        res.status(500).json({ error: 'Failed to select training set' });
      }
    }
  });

  // Supprimer un training set
  router.delete('/:id', AuthMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }

      const trainingSet = await trainingSetService.getTrainingSetById(id, userId);
      if (!trainingSet) {
        throw new AppError('Training set not found', 404);
      }

      await trainingSetService.deleteTrainingSet(id, userId);
      res.status(204).send();
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
      } else if (error instanceof Error && error.message === 'Training set not found') {
        res.status(404).json({ error: 'Training set not found' });
      } else {
        console.error('Error deleting training set:', error);
        res.status(500).json({ error: 'Failed to delete training set' });
      }
    }
  });

  return router;
};
