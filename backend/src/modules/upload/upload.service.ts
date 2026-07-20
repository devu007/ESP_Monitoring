import { parse } from 'csv-parse/sync';
import { prisma } from '../../shared/prisma';
import { NotFoundError, BadRequestError } from '../../shared/errors/app-error';
import {
  validateColumns,
  validateRows,
  buildValidationResult,
  ValidationResult,
  NUMERIC_COLUMNS,
} from './csv-validator';
import logger from '../../shared/logger';

interface SensorRowData {
  timestamp: Date;
  liquidRate: number | null;
  oilRate: number | null;
  waterCut: number | null;
  gasRate: number | null;
  gor: number | null;
  intakePressure: number | null;
  dischargePressure: number | null;
  annulusPressure: number | null;
  motorCurrent: number | null;
  motorVoltage: number | null;
  motorTemperature: number | null;
  pumpSpeed: number | null;
  frequency: number | null;
  vibration: number | null;
  powerFactor: number | null;
}

const COLUMN_TO_FIELD: Record<string, keyof SensorRowData> = {
  liquid_rate: 'liquidRate',
  oil_rate: 'oilRate',
  water_cut: 'waterCut',
  gas_rate: 'gasRate',
  gor: 'gor',
  intake_pressure: 'intakePressure',
  discharge_pressure: 'dischargePressure',
  annulus_pressure: 'annulusPressure',
  motor_current: 'motorCurrent',
  motor_voltage: 'motorVoltage',
  motor_temperature: 'motorTemperature',
  pump_speed: 'pumpSpeed',
  frequency: 'frequency',
  vibration: 'vibration',
  power_factor: 'powerFactor',
};

function parseNumeric(value: string | undefined): number | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (trimmed === '' || trimmed.toLowerCase() === 'null' || trimmed.toLowerCase() === 'na' || trimmed.toLowerCase() === 'nan') {
    return null;
  }
  const num = Number(trimmed);
  return isNaN(num) ? null : num;
}

export class UploadService {
  async processUpload(
    wellId: string,
    userId: string,
    file: Express.Multer.File
  ): Promise<{ uploadId: string; validation: ValidationResult; recordsInserted: number }> {
    // Verify well ownership
    const well = await prisma.well.findFirst({
      where: { id: wellId, field: { userId } },
    });
    if (!well) throw new NotFoundError('Well');

    // Create upload record
    const upload = await prisma.dataUpload.create({
      data: {
        wellId,
        fileName: file.originalname,
        rowCount: 0,
        status: 'VALIDATING',
      },
    });

    try {
      // Parse CSV
      const csvContent = file.buffer.toString('utf-8');
      const records: string[][] = parse(csvContent, {
        skip_empty_lines: true,
        relax_column_count: true,
      });

      if (records.length < 2) {
        throw new BadRequestError('CSV file must contain a header row and at least one data row');
      }

      const headers = records[0]!;
      const dataRows = records.slice(1).map((row, idx) => ({
        rowNumber: idx + 2, // 1-indexed, row 1 is header
        data: row as unknown as Record<string, string>,
      }));

      // Validate columns
      const { missingRequired, missingOptional, issues: colIssues } = validateColumns(headers);
      if (missingRequired.length > 0) {
        const validation = buildValidationResult(
          headers, dataRows, colIssues, [], new Set(), missingRequired, missingOptional
        );
        await prisma.dataUpload.update({
          where: { id: upload.id },
          data: {
            rowCount: dataRows.length,
            validRowCount: 0,
            invalidRowCount: dataRows.length,
            status: 'FAILED',
            validationErrors: validation.issues as any,
          },
        });
        return { uploadId: upload.id, validation, recordsInserted: 0 };
      }

      // Validate rows
      const { issues: rowIssues, invalidRowNumbers } = validateRows(headers, dataRows);
      const validation = buildValidationResult(
        headers, dataRows, colIssues, rowIssues, invalidRowNumbers, missingRequired, missingOptional
      );

      // Update upload with validation info
      await prisma.dataUpload.update({
        where: { id: upload.id },
        data: {
          rowCount: dataRows.length,
          validRowCount: validation.validRows,
          invalidRowCount: validation.invalidRows,
          status: 'PROCESSING',
          validationErrors: validation.issues.filter((i) => i.type === 'error') as any,
        },
      });

      // Insert valid rows
      const normalizedHeaders = headers.map((h) => h.trim().toLowerCase());
      const timestampIdx = normalizedHeaders.indexOf('timestamp');

      const validRecords: SensorRowData[] = [];
      for (const { rowNumber, data } of dataRows) {
        if (invalidRowNumbers.has(rowNumber)) continue;

        const rawTs = (data as any)[timestampIdx]?.trim();
        const ts = new Date(rawTs);
        if (isNaN(ts.getTime())) continue;

        const record: SensorRowData = { timestamp: ts } as SensorRowData;
        for (const col of NUMERIC_COLUMNS) {
          const colIdx = normalizedHeaders.indexOf(col);
          const fieldName = COLUMN_TO_FIELD[col];
          if (fieldName) {
            (record as any)[fieldName] = colIdx >= 0 ? parseNumeric((data as any)[colIdx]) : null;
          }
        }
        validRecords.push(record);
      }

      // Delete existing readings with overlapping timestamps so the new upload replaces old data
      if (validRecords.length > 0) {
        const timestamps = validRecords.map((r) => r.timestamp);
        const minTs = new Date(Math.min(...timestamps.map((t) => t.getTime())));
        const maxTs = new Date(Math.max(...timestamps.map((t) => t.getTime())));
        const deleted = await prisma.sensorReading.deleteMany({
          where: {
            wellId,
            timestamp: { gte: minTs, lte: maxTs },
          },
        });
        if (deleted.count > 0) {
          logger.info(`Upload ${upload.id}: removed ${deleted.count} overlapping readings (${minTs.toISOString()} to ${maxTs.toISOString()})`);
        }
      }

      // Bulk insert in batches
      const BATCH_SIZE = 500;
      let inserted = 0;
      for (let i = 0; i < validRecords.length; i += BATCH_SIZE) {
        const batch = validRecords.slice(i, i + BATCH_SIZE);
        const result = await prisma.sensorReading.createMany({
          data: batch.map((r) => ({
            wellId,
            uploadId: upload.id,
            timestamp: r.timestamp,
            liquidRate: r.liquidRate,
            oilRate: r.oilRate,
            waterCut: r.waterCut,
            gasRate: r.gasRate,
            gor: r.gor,
            intakePressure: r.intakePressure,
            dischargePressure: r.dischargePressure,
            annulusPressure: r.annulusPressure,
            motorCurrent: r.motorCurrent,
            motorVoltage: r.motorVoltage,
            motorTemperature: r.motorTemperature,
            pumpSpeed: r.pumpSpeed,
            frequency: r.frequency,
            vibration: r.vibration,
            powerFactor: r.powerFactor,
          })),
        });
        inserted += result.count;
      }

      // Mark completed
      await prisma.dataUpload.update({
        where: { id: upload.id },
        data: {
          status: 'COMPLETED',
          processedAt: new Date(),
        },
      });

      logger.info(`Upload ${upload.id}: ${inserted} records inserted for well ${wellId}`);

      return { uploadId: upload.id, validation, recordsInserted: inserted };
    } catch (error) {
      // Mark failed on unexpected errors
      if (error instanceof BadRequestError) {
        await prisma.dataUpload.update({
          where: { id: upload.id },
          data: { status: 'FAILED', validationErrors: [{ message: error.message }] as any },
        });
        throw error;
      }

      logger.error(`Upload ${upload.id} failed:`, error);
      await prisma.dataUpload.update({
        where: { id: upload.id },
        data: { status: 'FAILED' },
      });
      throw error;
    }
  }

  async getUploadStatus(uploadId: string, userId: string) {
    const upload = await prisma.dataUpload.findFirst({
      where: {
        id: uploadId,
        well: { field: { userId } },
      },
    });
    if (!upload) throw new NotFoundError('Upload');
    return upload;
  }

  async getUploadsByWell(wellId: string, userId: string) {
    const well = await prisma.well.findFirst({
      where: { id: wellId, field: { userId } },
    });
    if (!well) throw new NotFoundError('Well');

    return prisma.dataUpload.findMany({
      where: { wellId },
      orderBy: { uploadedAt: 'desc' },
    });
  }

  async deleteUpload(uploadId: string, userId: string) {
    const upload = await prisma.dataUpload.findFirst({
      where: { id: uploadId, well: { field: { userId } } },
    });
    if (!upload) throw new NotFoundError('Upload');

    // Delete associated sensor readings first, then the upload record
    await prisma.sensorReading.deleteMany({ where: { uploadId } });
    await prisma.dataUpload.delete({ where: { id: uploadId } });

    logger.info(`Upload ${uploadId} and its sensor readings deleted`);
    return { deletedUploadId: uploadId };
  }
}
