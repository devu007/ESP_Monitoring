import { Request, Response, NextFunction } from 'express';
import { AnalyticsService } from './analytics.service';

const analyticsService = new AnalyticsService();

export class AnalyticsController {
  async analyze(req: Request, res: Response, next: NextFunction) {
    try {
      const uploadId = req.body.uploadId as string | undefined;
      const result = await analyticsService.analyzeWell(
        req.params.id as string,
        req.user!.userId,
        uploadId
      );
      res.json({ status: 'success', data: result });
    } catch (error) {
      next(error);
    }
  }

  async getHealth(req: Request, res: Response, next: NextFunction) {
    try {
      const prediction = await analyticsService.getLatestPrediction(
        req.params.id as string,
        req.user!.userId
      );
      res.json({ status: 'success', data: prediction });
    } catch (error) {
      next(error);
    }
  }

  async getAnomalies(req: Request, res: Response, next: NextFunction) {
    try {
      const severity = req.query.severity as string | undefined;
      const anomalies = await analyticsService.getAnomalies(
        req.params.id as string,
        req.user!.userId,
        severity
      );
      res.json({ status: 'success', data: anomalies });
    } catch (error) {
      next(error);
    }
  }

  async getPredictions(req: Request, res: Response, next: NextFunction) {
    try {
      const predictions = await analyticsService.getPredictionHistory(
        req.params.id as string,
        req.user!.userId
      );
      res.json({ status: 'success', data: predictions });
    } catch (error) {
      next(error);
    }
  }

  async getChartData(req: Request, res: Response, next: NextFunction) {
    try {
      const uploadId = req.query.uploadId as string | undefined;
      const data = await analyticsService.getChartData(
        req.params.id as string,
        req.user!.userId,
        uploadId
      );
      res.json({ status: 'success', data });
    } catch (error) {
      next(error);
    }
  }

  async getHealthHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await analyticsService.getHealthHistory(
        req.params.id as string,
        req.user!.userId
      );
      res.json({ status: 'success', data });
    } catch (error) {
      next(error);
    }
  }
}
