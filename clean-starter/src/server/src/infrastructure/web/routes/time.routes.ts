import { Router } from 'express';
import { TimeService } from '../../../core/application/time.service';
import { AuthMiddleware } from '../middleware/auth.middleware';

export const createTimeRouter = (timeService: TimeService) => {
  const router = Router();

  router.get('/', AuthMiddleware, (req, res) => {
    const serverTime = timeService.getServerTime();
    res.json(serverTime);
  });

  return router;
};
