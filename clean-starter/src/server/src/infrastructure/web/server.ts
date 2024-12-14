import express, { Express } from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import { createServer as createHttpServer } from 'http';
import { PrismaClient } from '@prisma/client';
import { UserRepository } from '../../core/domain/user';
import { PrismaUserRepository } from '../repositories/prisma-user.repository';
import { AuthService } from '../../core/application/auth.service';
import { TrainingSetService } from '../../core/application/training-set.service';
import { TimeService } from '../../core/application/time.service';
import { createApiRouter } from './routes';
import { errorHandler } from './middleware/error.middleware';
import { WebSocketHandler } from './websocket/websocket.handler';
import path from 'path';

interface ServerDependencies {
  prisma: PrismaClient;
  userRepository: UserRepository;
  authService?: AuthService;
  trainingSetService?: TrainingSetService;
  timeService?: TimeService;
}

export const createServer = ({
  prisma,
  userRepository,
  authService: providedAuthService,
  trainingSetService: providedTrainingSetService,
  timeService: providedTimeService,
}: ServerDependencies): Express => {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());

  // Services
  const authService = providedAuthService || new AuthService(userRepository);
  const trainingSetService = providedTrainingSetService || new TrainingSetService(prisma);
  const timeService = providedTimeService || new TimeService();

  // API Routes
  app.use('/api', createApiRouter(authService, trainingSetService, timeService));

  // Error handling
  app.use(errorHandler);

  // Serve static files in production
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '../../../client/dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, '../../../client/dist/index.html'));
    });
  }

  return app;
};

export const createWebSocketServer = (server: any, timeService: TimeService) => {
  const wss = new WebSocketServer({ server });
  const wsHandler = new WebSocketHandler(wss, timeService);
  return wsHandler;
};

// Only if this file is run directly
if (require.main === module) {
  const prisma = new PrismaClient();
  const userRepository = new PrismaUserRepository(prisma);
  const timeService = new TimeService();
  const app = createServer({ prisma, userRepository, timeService });
  const port = process.env.PORT || 3000;
  const server = createHttpServer(app);
  
  createWebSocketServer(server, timeService);

  server.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
}
