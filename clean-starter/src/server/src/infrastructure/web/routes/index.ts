import { Router } from 'express';
import { AuthService } from '../../../core/application/auth.service';
import { TrainingSetService } from '../../../core/application/training-set.service';
import { TimeService } from '../../../core/application/time.service';
import { createAuthRouter } from './auth.routes';
import { createTrainingSetRoutes } from './training-set.routes';
import { createTimeRouter } from './time.routes';
import modelRoutes from '../../../routes/model.routes';

export const createApiRouter = (
  authService: AuthService,
  trainingSetService: TrainingSetService,
  timeService: TimeService
) => {
  const router = Router();

  // Mount routes
  router.use('/auth', createAuthRouter(authService));
  router.use('/training-sets', createTrainingSetRoutes(trainingSetService));
  router.use('/time', createTimeRouter(timeService));
  router.use('/models', modelRoutes);

  return router;
};
