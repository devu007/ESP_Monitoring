export const HEALTH_SCORE_WEIGHTS = {
  productionDegradation: 0.20,
  pumpEfficiencyDegradation: 0.20,
  motorCurrentAbnormality: 0.15,
  motorTemperatureAbnormality: 0.15,
  pressureAbnormality: 0.10,
  vibrationAbnormality: 0.10,
  gasInterference: 0.05,
  pumpOffIndicators: 0.05,
} as const;

export const HEALTH_SCORE_RANGES = {
  HEALTHY: { min: 90, max: 100, label: 'Healthy' },
  NORMAL: { min: 70, max: 89, label: 'Normal' },
  DEGRADING: { min: 40, max: 69, label: 'Degrading' },
  CRITICAL: { min: 0, max: 39, label: 'Critical' },
} as const;

export const RISK_LEVELS = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
} as const;

export const DEFAULT_THRESHOLDS = {
  motorTemperatureWarning: 250,
  motorTemperatureCritical: 300,
  vibrationWarning: 0.5,
  vibrationCritical: 1.0,
  zScoreThreshold: 3.0,
  minDataPointsForAnalysis: 30,
  rollingWindowDays: 30,
  trendWindowDays: 14,
} as const;
