import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import { createServer as createHttpServer } from 'http';
import { PrismaClient } from '@prisma/client';
import { PrismaUserRepository } from '../repositories/prisma-user.repository';
import { AuthService } from '../../core/application/auth.service';
import { TimeService } from '../../core/application/time.service';
import { WebSocketHandler } from './websocket/websocket.handler';
import { createApiRouter } from './routes';
import path from 'path';

interface ServerDependencies {
  prisma: PrismaClient;
  userRepository: PrismaUserRepository;
  authService: AuthService;
  timeService: TimeService;
}

export const createServer = ({ 
  prisma, 
  userRepository, 
  authService,
  timeService 
}: ServerDependencies) => {
  const app = express();
  
  // Middleware
  app.use(cors());
  app.use(express.json());

  // API Routes
  app.use('/api', createApiRouter(authService));

  // Serve static files in production
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '../../../client/dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, '../../../client/dist/index.html'));
    });
  }

  return app;
};

// Only if this file is run directly
if (require.main === module) {
  const prisma = new PrismaClient();
  const userRepository = new PrismaUserRepository(prisma);
  const authService = new AuthService(userRepository);
  const timeService = new TimeService();

  const app = createServer({ prisma, userRepository, authService, timeService });
  const server = createHttpServer(app);
  const wss = new WebSocketServer({ server });

  // Initialize WebSocket handler
  new WebSocketHandler(wss, timeService);

  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}
