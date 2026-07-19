import { Router } from 'express';
import { EspController } from './esp.controller';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validation';
import { createEspSchema, updateEspSchema } from './esp.schema';

const router = Router();
const controller = new EspController();

router.use(authenticate);

router.post('/:wellId/esp', validate(createEspSchema), (req, res, next) => controller.create(req, res, next));
router.put('/:wellId/esp', validate(updateEspSchema), (req, res, next) => controller.update(req, res, next));
router.get('/:wellId/esp', (req, res, next) => controller.findByWell(req, res, next));

export { router as espRoutes };
