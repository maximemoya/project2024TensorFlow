import { Router } from 'express';
import { AuthService } from '../../../core/application/auth.service';
import { AppError } from '../../error/app-error';

export const createAuthRouter = (authService: AuthService) => {
  const router = Router();

  router.post('/register', async (req, res) => {
    try {
      const { email, password, name } = req.body;

      if (!email || !password || !name) {
        throw new AppError('Missing required fields', 400);
      }

      const user = await authService.register(email, password, name);
      res.status(201).json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name
        },
        token: authService.generateToken(user)
      });
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ error: error.message });
      } else {
        console.error('Registration error:', error);
        return res.status(500).json({ error: 'Registration failed' });
      }
    }
  });

  router.post('/login', async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        throw new AppError('Missing email or password', 400);
      }

      const { token } = await authService.login(email, password);
      const user = await authService.getUserByEmail(email);
      
      if (!user) {
        throw new AppError('User not found', 404);
      }

      res.status(200).json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name
        },
        token
      });
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ error: error.message });
      } else {
        console.error('Login error:', error);
        return res.status(500).json({ error: 'Login failed' });
      }
    }
  });

  return router;
};
