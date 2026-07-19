import { Request, Response, NextFunction } from 'express';
import { EspService } from './esp.service';

const espService = new EspService();

export class EspController {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const esp = await espService.create(req.params.wellId as string, req.user!.userId, req.body);
      res.status(201).json({ status: 'success', data: esp });
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const esp = await espService.update(req.params.wellId as string, req.user!.userId, req.body);
      res.json({ status: 'success', data: esp });
    } catch (error) {
      next(error);
    }
  }

  async findByWell(req: Request, res: Response, next: NextFunction) {
    try {
      const esp = await espService.findByWell(req.params.wellId as string, req.user!.userId);
      res.json({ status: 'success', data: esp });
    } catch (error) {
      next(error);
    }
  }
}
