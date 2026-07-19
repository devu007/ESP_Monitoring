import { Router } from 'express';
import { FieldController } from './field.controller';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validation';
import { createFieldSchema, updateFieldSchema } from './field.schema';

const router = Router();
const controller = new FieldController();

router.use(authenticate);

router.post('/', validate(createFieldSchema), (req, res, next) => controller.create(req, res, next));
router.get('/', (req, res, next) => controller.findAll(req, res, next));
router.get('/:id', (req, res, next) => controller.findById(req, res, next));
router.put('/:id', validate(updateFieldSchema), (req, res, next) => controller.update(req, res, next));
router.delete('/:id', (req, res, next) => controller.delete(req, res, next));

export { router as fieldRoutes };
