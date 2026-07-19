import { Request, Response, NextFunction } from 'express';
import { UploadService } from './upload.service';

const uploadService = new UploadService();

export class UploadController {
  async upload(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        res.status(400).json({ status: 'error', message: 'No CSV file provided' });
        return;
      }

      const result = await uploadService.processUpload(
        req.params.wellId as string,
        req.user!.userId,
        req.file
      );

      const statusCode = result.validation.isValid ? 200 : 200;
      res.status(statusCode).json({
        status: 'success',
        data: {
          uploadId: result.uploadId,
          recordsInserted: result.recordsInserted,
          validation: result.validation,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async getStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const upload = await uploadService.getUploadStatus(
        req.params.uploadId as string,
        req.user!.userId
      );
      res.json({ status: 'success', data: upload });
    } catch (error) {
      next(error);
    }
  }

  async getByWell(req: Request, res: Response, next: NextFunction) {
    try {
      const uploads = await uploadService.getUploadsByWell(
        req.params.wellId as string,
        req.user!.userId
      );
      res.json({ status: 'success', data: uploads });
    } catch (error) {
      next(error);
    }
  }

  async deleteUpload(req: Request, res: Response, next: NextFunction) {
    try {
      await uploadService.deleteUpload(
        req.params.uploadId as string,
        req.user!.userId
      );
      res.json({ status: 'success', message: 'Upload and associated data deleted' });
    } catch (error) {
      next(error);
    }
  }
}
