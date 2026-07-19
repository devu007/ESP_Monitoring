import { Router } from 'express';
import multer from 'multer';
import { UploadController } from './upload.controller';
import { authenticate } from '../../middleware/auth';

const router = Router();
const controller = new UploadController();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  },
});

router.use(authenticate);

router.post(
  '/:wellId/upload',
  upload.single('file'),
  (req, res, next) => controller.upload(req, res, next)
);

router.get(
  '/:wellId/uploads',
  (req, res, next) => controller.getByWell(req, res, next)
);

router.get(
  '/uploads/:uploadId/status',
  (req, res, next) => controller.getStatus(req, res, next)
);

router.delete(
  '/uploads/:uploadId',
  (req, res, next) => controller.deleteUpload(req, res, next)
);

export { router as uploadRoutes };
