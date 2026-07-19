export const REQUIRED_COLUMNS = ['timestamp'] as const;

export const EXPECTED_COLUMNS = [
  'timestamp',
  'well_id',
  'liquid_rate',
  'oil_rate',
  'water_cut',
  'gas_rate',
  'gor',
  'intake_pressure',
  'discharge_pressure',
  'annulus_pressure',
  'motor_current',
  'motor_voltage',
  'motor_temperature',
  'pump_speed',
  'frequency',
  'vibration',
  'power_factor',
] as const;

export const NUMERIC_COLUMNS = EXPECTED_COLUMNS.filter((c) => c !== 'timestamp' && c !== 'well_id');

const REASONABLE_RANGES: Record<string, { min: number; max: number }> = {
  liquid_rate: { min: 0, max: 50000 },
  oil_rate: { min: 0, max: 50000 },
  water_cut: { min: 0, max: 1 },
  gas_rate: { min: 0, max: 100000 },
  gor: { min: 0, max: 100000 },
  intake_pressure: { min: 0, max: 10000 },
  discharge_pressure: { min: 0, max: 15000 },
  annulus_pressure: { min: 0, max: 10000 },
  motor_current: { min: 0, max: 500 },
  motor_voltage: { min: 0, max: 10000 },
  motor_temperature: { min: 0, max: 500 },
  pump_speed: { min: 0, max: 10000 },
  frequency: { min: 0, max: 100 },
  vibration: { min: 0, max: 50 },
  power_factor: { min: 0, max: 1 },
};

export interface ValidationIssue {
  type: 'error' | 'warning';
  category: 'missing_column' | 'data_type' | 'missing_value' | 'duplicate_timestamp' | 'out_of_range' | 'time_ordering' | 'invalid_value';
  row?: number;
  column?: string;
  message: string;
  value?: string;
}

export interface ValidationResult {
  isValid: boolean;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  issues: ValidationIssue[];
  columns: string[];
  missingRequiredColumns: string[];
  missingOptionalColumns: string[];
}

interface ParsedRow {
  rowNumber: number;
  data: Record<string, string>;
}

export function validateColumns(headers: string[]): {
  missingRequired: string[];
  missingOptional: string[];
  issues: ValidationIssue[];
} {
  const normalized = headers.map((h) => h.trim().toLowerCase());
  const issues: ValidationIssue[] = [];

  const missingRequired = REQUIRED_COLUMNS.filter((c) => !normalized.includes(c));
  for (const col of missingRequired) {
    issues.push({
      type: 'error',
      category: 'missing_column',
      column: col,
      message: `Required column "${col}" is missing`,
    });
  }

  const missingOptional = EXPECTED_COLUMNS.filter(
    (c) => !REQUIRED_COLUMNS.includes(c as any) && !normalized.includes(c)
  );
  for (const col of missingOptional) {
    issues.push({
      type: 'warning',
      category: 'missing_column',
      column: col,
      message: `Optional column "${col}" is missing — related metrics will not be computed`,
    });
  }

  return { missingRequired, missingOptional, issues };
}

export function validateRows(
  headers: string[],
  rows: ParsedRow[]
): { issues: ValidationIssue[]; invalidRowNumbers: Set<number> } {
  const issues: ValidationIssue[] = [];
  const invalidRowNumbers = new Set<number>();
  const normalizedHeaders = headers.map((h) => h.trim().toLowerCase());

  const timestampsSeen = new Map<string, number>();
  let lastTimestamp: Date | null = null;

  for (const { rowNumber, data } of rows) {
    const rawTs = data[normalizedHeaders.indexOf('timestamp')]?.trim();

    // Timestamp validation
    if (!rawTs) {
      issues.push({
        type: 'error',
        category: 'missing_value',
        row: rowNumber,
        column: 'timestamp',
        message: `Row ${rowNumber}: timestamp is missing`,
      });
      invalidRowNumbers.add(rowNumber);
      continue;
    }

    const ts = new Date(rawTs);
    if (isNaN(ts.getTime())) {
      issues.push({
        type: 'error',
        category: 'data_type',
        row: rowNumber,
        column: 'timestamp',
        value: rawTs,
        message: `Row ${rowNumber}: invalid timestamp format "${rawTs}"`,
      });
      invalidRowNumbers.add(rowNumber);
      continue;
    }

    // Duplicate check
    const tsKey = ts.toISOString();
    if (timestampsSeen.has(tsKey)) {
      issues.push({
        type: 'error',
        category: 'duplicate_timestamp',
        row: rowNumber,
        column: 'timestamp',
        value: rawTs,
        message: `Row ${rowNumber}: duplicate timestamp "${rawTs}" (first seen at row ${timestampsSeen.get(tsKey)})`,
      });
      invalidRowNumbers.add(rowNumber);
      continue;
    }
    timestampsSeen.set(tsKey, rowNumber);

    // Time ordering check
    if (lastTimestamp && ts < lastTimestamp) {
      issues.push({
        type: 'warning',
        category: 'time_ordering',
        row: rowNumber,
        column: 'timestamp',
        message: `Row ${rowNumber}: timestamp is out of chronological order`,
      });
    }
    lastTimestamp = ts;

    // Numeric column validation
    for (const col of NUMERIC_COLUMNS) {
      const colIdx = normalizedHeaders.indexOf(col);
      if (colIdx === -1) continue;

      const raw = data[colIdx]?.trim();
      if (!raw || raw === '' || raw.toLowerCase() === 'null' || raw.toLowerCase() === 'na' || raw.toLowerCase() === 'nan') {
        continue; // Missing numeric values are allowed (nullable)
      }

      const num = Number(raw);
      if (isNaN(num)) {
        issues.push({
          type: 'error',
          category: 'data_type',
          row: rowNumber,
          column: col,
          value: raw,
          message: `Row ${rowNumber}: "${col}" has non-numeric value "${raw}"`,
        });
        invalidRowNumbers.add(rowNumber);
        continue;
      }

      const range = REASONABLE_RANGES[col];
      if (range && (num < range.min || num > range.max)) {
        issues.push({
          type: 'warning',
          category: 'out_of_range',
          row: rowNumber,
          column: col,
          value: raw,
          message: `Row ${rowNumber}: "${col}" value ${num} is outside expected range [${range.min}, ${range.max}]`,
        });
      }
    }
  }

  return { issues, invalidRowNumbers };
}

export function buildValidationResult(
  headers: string[],
  rows: ParsedRow[],
  columnIssues: ValidationIssue[],
  rowIssues: ValidationIssue[],
  invalidRowNumbers: Set<number>,
  missingRequired: string[],
  missingOptional: string[]
): ValidationResult {
  const allIssues = [...columnIssues, ...rowIssues];

  // Cap issue list to prevent giant payloads
  const MAX_ISSUES = 200;
  const cappedIssues = allIssues.length > MAX_ISSUES
    ? [
        ...allIssues.slice(0, MAX_ISSUES),
        {
          type: 'warning' as const,
          category: 'missing_value' as const,
          message: `Showing first ${MAX_ISSUES} of ${allIssues.length} total issues`,
        },
      ]
    : allIssues;

  return {
    isValid: missingRequired.length === 0 && invalidRowNumbers.size === 0,
    totalRows: rows.length,
    validRows: rows.length - invalidRowNumbers.size,
    invalidRows: invalidRowNumbers.size,
    issues: cappedIssues,
    columns: headers.map((h) => h.trim().toLowerCase()),
    missingRequiredColumns: missingRequired,
    missingOptionalColumns: missingOptional,
  };
}
