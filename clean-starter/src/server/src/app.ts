import express from 'express';
import cors from 'cors';
import path from 'path';
import modelRoutes from './routes/model.routes';
import { createTrainingSetRoutes } from './infrastructure/web/routes/training-set.routes';
import { TrainingSetService } from './core/application/training-set.service';
import { PrismaClient } from '@prisma/client';

const app = express();
const prisma = new PrismaClient();

// Middleware
app.use(cors());
app.use(express.json());

const clientDistPath = path.resolve(__dirname, '../../client/dist');
console.log('Static files path:', clientDistPath);

// Serve static files from the React app
app.use(express.static(clientDistPath));

// API Routes
app.use('/api/models', modelRoutes);
app.use('/api/training-sets', createTrainingSetRoutes(new TrainingSetService(prisma)));

// Handle React routing, return all requests to React app
app.get('*', (req, res) => {
  console.log('Requested path:', req.path);
  const indexPath = path.join(clientDistPath, 'index.html');
  console.log('Serving index.html from:', indexPath);
  if (!require('fs').existsSync(indexPath)) {
    console.error('index.html not found at:', indexPath);
    return res.status(404).send('index.html not found');
  }
  res.sendFile(indexPath);
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

export { app };
