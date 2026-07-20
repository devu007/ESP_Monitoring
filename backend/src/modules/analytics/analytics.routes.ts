import { Router } from 'express';
import { AnalyticsController } from './analytics.controller';
import { authenticate } from '../../middleware/auth';

const router = Router();
const controller = new AnalyticsController();

router.use(authenticate);

router.post('/:id/analyze', (req, res, next) => controller.analyze(req, res, next));
router.get('/:id/health', (req, res, next) => controller.getHealth(req, res, next));
router.get('/:id/anomalies', (req, res, next) => controller.getAnomalies(req, res, next));
router.get('/:id/predictions', (req, res, next) => controller.getPredictions(req, res, next));

export { router as analyticsRoutes };
