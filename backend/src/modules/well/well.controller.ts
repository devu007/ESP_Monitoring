import { Request, Response, NextFunction } from 'express';
import { WellService } from './well.service';

const wellService = new WellService();

export class WellController {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const well = await wellService.create(req.user!.userId, req.body);
      res.status(201).json({ status: 'success', data: well });
    } catch (error) {
      next(error);
    }
  }

  async findAll(req: Request, res: Response, next: NextFunction) {
    try {
      const fieldId = req.query.fieldId as string | undefined;
      const wells = await wellService.findAll(req.user!.userId, fieldId);
      res.json({ status: 'success', data: wells });
    } catch (error) {
      next(error);
    }
  }

  async findById(req: Request, res: Response, next: NextFunction) {
    try {
      const well = await wellService.findById(req.params.id as string, req.user!.userId);
      res.json({ status: 'success', data: well });
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const well = await wellService.update(req.params.id as string, req.user!.userId, req.body);
      res.json({ status: 'success', data: well });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await wellService.delete(req.params.id as string, req.user!.userId);
      res.json({ status: 'success', message: 'Well deleted' });
    } catch (error) {
      next(error);
    }
  }

  async getDashboardSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const summary = await wellService.getDashboardSummary(req.user!.userId);
      res.json({ status: 'success', data: summary });
    } catch (error) {
      next(error);
    }
  }

  async getSensorReadings(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = Math.min(parseInt(req.query.pageSize as string) || 50, 200);
      const sortOrder = (req.query.sort as string) === 'asc' ? 'asc' as const : 'desc' as const;
      const uploadId = req.query.uploadId as string | undefined;

      const result = await wellService.getSensorReadings(
        req.params.id as string,
        req.user!.userId,
        page,
        pageSize,
        sortOrder,
        uploadId
      );
      res.json({ status: 'success', data: result });
    } catch (error) {
      next(error);
    }
  }
}
