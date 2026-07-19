import { prisma } from '../../shared/prisma';
import { NotFoundError, BadRequestError } from '../../shared/errors/app-error';
import { CreateWellInput, UpdateWellInput } from './well.schema';

export class WellService {
  async create(userId: string, input: CreateWellInput) {
    const field = await prisma.field.findFirst({
      where: { id: input.fieldId, userId },
    });
    if (!field) throw new BadRequestError('Field not found or not owned by user');

    return prisma.well.create({
      data: input,
      include: { esp: true, field: { select: { id: true, name: true } } },
    });
  }

  async findAll(userId: string, fieldId?: string) {
    const where: any = {
      field: { userId },
    };
    if (fieldId) where.fieldId = fieldId;

    return prisma.well.findMany({
      where,
      include: {
        esp: true,
        field: { select: { id: true, name: true } },
        predictions: {
          orderBy: { analyzedAt: 'desc' },
          take: 1,
          select: {
            healthScore: true,
            riskLevel: true,
            failureProbability: true,
            predictedFailureType: true,
            analyzedAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string, userId: string) {
    const well = await prisma.well.findFirst({
      where: { id, field: { userId } },
      include: {
        esp: true,
        field: { select: { id: true, name: true } },
        predictions: {
          orderBy: { analyzedAt: 'desc' },
          take: 1,
        },
        uploads: {
          orderBy: { uploadedAt: 'desc' },
          take: 5,
        },
      },
    });
    if (!well) throw new NotFoundError('Well');
    return well;
  }

  async update(id: string, userId: string, input: UpdateWellInput) {
    await this.findById(id, userId);
    return prisma.well.update({
      where: { id },
      data: input,
      include: { esp: true, field: { select: { id: true, name: true } } },
    });
  }

  async delete(id: string, userId: string) {
    await this.findById(id, userId);
    return prisma.well.delete({ where: { id } });
  }

  async getDashboardSummary(userId: string) {
    const wells = await prisma.well.findMany({
      where: { field: { userId } },
      include: {
        predictions: {
          orderBy: { analyzedAt: 'desc' },
          take: 1,
          select: {
            healthScore: true,
            riskLevel: true,
            predictedFailureType: true,
          },
        },
      },
    });

    const summary = {
      totalWells: wells.length,
      healthy: 0,
      normal: 0,
      degrading: 0,
      critical: 0,
      highRiskEsps: [] as { wellId: string; wellName: string; healthScore: number; riskLevel: string; failureType: string | null }[],
    };

    for (const well of wells) {
      const prediction = well.predictions[0];
      if (!prediction) {
        summary.normal++;
        continue;
      }

      const score = prediction.healthScore;
      if (score >= 90) summary.healthy++;
      else if (score >= 70) summary.normal++;
      else if (score >= 40) summary.degrading++;
      else summary.critical++;

      if (prediction.riskLevel === 'HIGH' || prediction.riskLevel === 'CRITICAL') {
        summary.highRiskEsps.push({
          wellId: well.id,
          wellName: well.name,
          healthScore: prediction.healthScore,
          riskLevel: prediction.riskLevel,
          failureType: prediction.predictedFailureType,
        });
      }
    }

    return summary;
  }

  async getSensorReadings(
    wellId: string,
    userId: string,
    page: number = 1,
    pageSize: number = 50,
    sortOrder: 'asc' | 'desc' = 'desc',
    uploadId?: string
  ) {
    const well = await prisma.well.findFirst({
      where: { id: wellId, field: { userId } },
    });
    if (!well) throw new NotFoundError('Well');

    const skip = (page - 1) * pageSize;
    const where: any = { wellId };
    if (uploadId) where.uploadId = uploadId;

    const [readings, totalCount] = await Promise.all([
      prisma.sensorReading.findMany({
        where,
        orderBy: { timestamp: sortOrder },
        skip,
        take: pageSize,
        select: {
          id: true,
          timestamp: true,
          liquidRate: true,
          oilRate: true,
          waterCut: true,
          gasRate: true,
          gor: true,
          intakePressure: true,
          dischargePressure: true,
          annulusPressure: true,
          motorCurrent: true,
          motorVoltage: true,
          motorTemperature: true,
          pumpSpeed: true,
          frequency: true,
          vibration: true,
          powerFactor: true,
        },
      }),
      prisma.sensorReading.count({ where }),
    ]);

    return {
      readings,
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize),
      },
    };
  }
}
