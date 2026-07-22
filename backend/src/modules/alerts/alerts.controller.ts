import { Request, Response, NextFunction } from 'express';
import { AlertsService } from './alerts.service';

const alertsService = new AlertsService();

export class AlertsController {
  async getAlerts(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 20;
      const severity = req.query.severity as string | undefined;
      const isRead = req.query.isRead === 'true' ? true : req.query.isRead === 'false' ? false : undefined;
      const wellId = req.query.wellId as string | undefined;

      const result = await alertsService.getAlerts(req.user!.userId, { severity, isRead, wellId }, page, pageSize);
      res.json({ status: 'success', data: result });
    } catch (error) {
      next(error);
    }
  }

  async getCounts(req: Request, res: Response, next: NextFunction) {
    try {
      const counts = await alertsService.getAlertCounts(req.user!.userId);
      res.json({ status: 'success', data: counts });
    } catch (error) {
      next(error);
    }
  }

  async markAsRead(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await alertsService.markAsRead(req.params.id as string, req.user!.userId);
      res.json({ status: 'success', data: result });
    } catch (error) {
      next(error);
    }
  }

  async markAllAsRead(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await alertsService.markAllAsRead(req.user!.userId);
      res.json({ status: 'success', data: result });
    } catch (error) {
      next(error);
    }
  }

  async dismiss(req: Request, res: Response, next: NextFunction) {
    try {
      await alertsService.dismissAlert(req.params.id as string, req.user!.userId);
      res.json({ status: 'success', data: { deleted: true } });
    } catch (error) {
      next(error);
    }
  }
}
