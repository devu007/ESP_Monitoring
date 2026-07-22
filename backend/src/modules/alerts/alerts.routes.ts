import { Router } from 'express';
import { AlertsController } from './alerts.controller';
import { authenticate } from '../../middleware/auth';

const router = Router();
const controller = new AlertsController();

router.use(authenticate);

router.get('/', (req, res, next) => controller.getAlerts(req, res, next));
router.get('/counts', (req, res, next) => controller.getCounts(req, res, next));
router.put('/read-all', (req, res, next) => controller.markAllAsRead(req, res, next));
router.put('/:id/read', (req, res, next) => controller.markAsRead(req, res, next));
router.delete('/:id', (req, res, next) => controller.dismiss(req, res, next));

export { router as alertRoutes };
