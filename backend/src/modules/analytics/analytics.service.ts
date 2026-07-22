import { prisma } from '../../shared/prisma';
import { config } from '../../config';
import { NotFoundError, AppError } from '../../shared/errors/app-error';
import logger from '../../shared/logger';

export class AnalyticsService {
  async analyzeWell(wellId: string, userId: string, uploadId?: string) {
    const well = await prisma.well.findFirst({
      where: { id: wellId, field: { userId } },
    });
    if (!well) throw new NotFoundError('Well');

    // Call ML service
    let mlResult: any;
    const mlPayload: Record<string, string> = { well_id: wellId };
    if (uploadId) mlPayload.upload_id = uploadId;

    try {
      const response = await fetch(`${config.mlService.url}/ml/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mlPayload),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        logger.error(`ML service error: ${response.status} ${errorBody}`);
        throw new AppError('ML service analysis failed', 502);
      }

      mlResult = await response.json();
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Failed to connect to ML service:', error);
      throw new AppError('ML service is unavailable. Make sure it is running on port 8000.', 503);
    }

    // Store prediction result
    const riskLevel = this.mapRiskLevel(mlResult.risk_level);
    const prediction = await prisma.failurePrediction.create({
      data: {
        wellId,
        uploadId: uploadId || null,
        healthScore: mlResult.health_score ?? 0,
        riskLevel,
        failureProbability: mlResult.failure_probability,
        predictedFailureType: mlResult.predicted_failure_type,
        estimatedFailureWindow: mlResult.estimated_failure_window,
        confidence: mlResult.confidence,
        insufficientData: mlResult.insufficient_data ?? false,
        missingDataReason: mlResult.missing_data_reason,
        contributingFactors: mlResult.contributing_factors ?? [],
        anomalySummary: mlResult.anomalies ?? [],
        recommendations: mlResult.recommendations ?? [],
        explanation: mlResult.explanation ?? '',
      },
    });

    // Store anomalies
    if (mlResult.anomalies && mlResult.anomalies.length > 0) {
      const anomalyData = mlResult.anomalies.map((a: any) => ({
        wellId,
        parameter: a.parameter,
        timestamp: new Date(a.timestamp),
        actualValue: a.actual_value,
        expectedMin: a.expected_min,
        expectedMax: a.expected_max,
        zScore: a.z_score,
        severity: this.mapSeverity(a.severity),
        explanation: a.explanation,
      }));

      await prisma.anomaly.createMany({
        data: anomalyData,
        skipDuplicates: true,
      });
    }

    // Create alerts for rule results
    if (mlResult.rule_results && mlResult.rule_results.length > 0) {
      for (const rule of mlResult.rule_results) {
        await prisma.alert.create({
          data: {
            wellId,
            severity: this.mapSeverity(rule.severity),
            type: rule.failure_type,
            title: rule.rule_name,
            message: rule.explanation,
          },
        });
      }
    }

    logger.info(`Analysis complete for well ${wellId}: score=${mlResult.health_score}, risk=${mlResult.risk_level}`);

    return {
      predictionId: prediction.id,
      ...mlResult,
    };
  }

  async getLatestPrediction(wellId: string, userId: string) {
    const well = await prisma.well.findFirst({
      where: { id: wellId, field: { userId } },
    });
    if (!well) throw new NotFoundError('Well');

    const prediction = await prisma.failurePrediction.findFirst({
      where: { wellId },
      orderBy: { analyzedAt: 'desc' },
    });

    return prediction;
  }

  async getAnomalies(wellId: string, userId: string, severity?: string) {
    const well = await prisma.well.findFirst({
      where: { id: wellId, field: { userId } },
    });
    if (!well) throw new NotFoundError('Well');

    const where: any = { wellId };
    if (severity) where.severity = severity;

    return prisma.anomaly.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: 100,
    });
  }

  async getPredictionHistory(wellId: string, userId: string) {
    const well = await prisma.well.findFirst({
      where: { id: wellId, field: { userId } },
    });
    if (!well) throw new NotFoundError('Well');

    return prisma.failurePrediction.findMany({
      where: { wellId },
      orderBy: { analyzedAt: 'desc' },
      take: 20,
    });
  }

  async getChartData(wellId: string, userId: string, uploadId?: string) {
    const well = await prisma.well.findFirst({
      where: { id: wellId, field: { userId } },
    });
    if (!well) throw new NotFoundError('Well');

    const where: any = { wellId };
    if (uploadId) where.uploadId = uploadId;

    const readings = await prisma.sensorReading.findMany({
      where,
      orderBy: { timestamp: 'asc' },
      select: {
        timestamp: true,
        liquidRate: true,
        oilRate: true,
        waterCut: true,
        intakePressure: true,
        dischargePressure: true,
        motorCurrent: true,
        motorTemperature: true,
        vibration: true,
        frequency: true,
        powerFactor: true,
      },
    });

    return readings;
  }

  async getHealthHistory(wellId: string, userId: string) {
    const well = await prisma.well.findFirst({
      where: { id: wellId, field: { userId } },
    });
    if (!well) throw new NotFoundError('Well');

    return prisma.failurePrediction.findMany({
      where: { wellId, insufficientData: false },
      orderBy: { analyzedAt: 'asc' },
      select: {
        analyzedAt: true,
        healthScore: true,
        riskLevel: true,
        failureProbability: true,
        predictedFailureType: true,
      },
      take: 50,
    });
  }

  private mapRiskLevel(level: string | null): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    const map: Record<string, 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'> = {
      LOW: 'LOW', MEDIUM: 'MEDIUM', HIGH: 'HIGH', CRITICAL: 'CRITICAL',
    };
    return map[level || 'LOW'] || 'LOW';
  }

  private mapSeverity(severity: string): 'INFO' | 'WARNING' | 'HIGH' | 'CRITICAL' {
    const map: Record<string, 'INFO' | 'WARNING' | 'HIGH' | 'CRITICAL'> = {
      LOW: 'INFO', MEDIUM: 'WARNING', WARNING: 'WARNING', HIGH: 'HIGH', CRITICAL: 'CRITICAL',
    };
    return map[severity || 'INFO'] || 'INFO';
  }
}
