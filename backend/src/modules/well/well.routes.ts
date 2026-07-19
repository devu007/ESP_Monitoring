import { Router } from 'express';
import { WellController } from './well.controller';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validation';
import { createWellSchema, updateWellSchema } from './well.schema';

const router = Router();
const controller = new WellController();

router.use(authenticate);

router.get('/dashboard/summary', (req, res, next) => controller.getDashboardSummary(req, res, next));
router.post('/', validate(createWellSchema), (req, res, next) => controller.create(req, res, next));
router.get('/', (req, res, next) => controller.findAll(req, res, next));
router.get('/:id', (req, res, next) => controller.findById(req, res, next));
router.get('/:id/readings', (req, res, next) => controller.getSensorReadings(req, res, next));
router.put('/:id', validate(updateWellSchema), (req, res, next) => controller.update(req, res, next));
router.delete('/:id', (req, res, next) => controller.delete(req, res, next));

export { router as wellRoutes };
