import { Router } from 'express';
import { createAuthRouter } from './auth.routes';
import { AuthService } from '../../../core/application/auth.service';

export const createApiRouter = (authService: AuthService) => {
  const router = Router();

  // Mount routes
  router.use('/auth', createAuthRouter(authService));

  return router;
};
