import { Request, Response, NextFunction } from 'express';
import { FieldService } from './field.service';

const fieldService = new FieldService();

export class FieldController {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const field = await fieldService.create(req.user!.userId, req.body);
      res.status(201).json({ status: 'success', data: field });
    } catch (error) {
      next(error);
    }
  }

  async findAll(req: Request, res: Response, next: NextFunction) {
    try {
      const fields = await fieldService.findAllByUser(req.user!.userId);
      res.json({ status: 'success', data: fields });
    } catch (error) {
      next(error);
    }
  }

  async findById(req: Request, res: Response, next: NextFunction) {
    try {
      const field = await fieldService.findById(req.params.id as string, req.user!.userId);
      res.json({ status: 'success', data: field });
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const field = await fieldService.update(req.params.id as string, req.user!.userId, req.body);
      res.json({ status: 'success', data: field });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await fieldService.delete(req.params.id as string, req.user!.userId);
      res.json({ status: 'success', message: 'Field deleted' });
    } catch (error) {
      next(error);
    }
  }
}
