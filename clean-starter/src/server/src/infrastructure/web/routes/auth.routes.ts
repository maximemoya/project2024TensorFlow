import { Router } from 'express';
import { AuthService } from '../../../core/application/auth.service';
import { UserRepository } from '../../../core/domain/user';

export class AppError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AppError';
  }
}

export const createAuthRouter = (authService: AuthService) => {
  const router = Router();

  router.post('/register', async (req, res) => {
    try {
      const { email, password, name } = req.body;
      const result = await authService.register(email, password, name);
      res.json(result);
    } catch (error) {
      if (error instanceof AppError || error instanceof Error) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(400).json({ error: 'An unexpected error occurred' });
      }
    }
  });

  router.post('/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      const result = await authService.login(email, password);
      res.json(result);
    } catch (error) {
      if (error instanceof AppError || error instanceof Error) {
        res.status(401).json({ error: error.message });
      } else {
        res.status(401).json({ error: 'An unexpected error occurred' });
      }
    }
  });

  return router;
};
