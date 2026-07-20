export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

export interface Field {
  id: string;
  name: string;
  location?: string;
  description?: string;
  userId: string;
  _count?: { wells: number };
  wells?: Well[];
  createdAt: string;
  updatedAt: string;
}

export interface Well {
  id: string;
  name: string;
  apiNumber?: string;
  fieldId: string;
  field?: { id: string; name: string };
  latitude?: number;
  longitude?: number;
  status: string;
  esp?: Esp;
  predictions?: PredictionSummary[];
  uploads?: UploadSummary[];
  createdAt: string;
  updatedAt: string;
}

export interface Esp {
  id: string;
  wellId: string;
  manufacturer: string;
  model: string;
  installationDate: string;
  pumpStages: number;
  ratedPower: number;
  ratedSpeed: number;
  frequencyMin: number;
  frequencyMax: number;
  motorRating: number;
  designFlowMin: number;
  designFlowMax: number;
}

export interface PredictionSummary {
  healthScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  failureProbability?: number;
  predictedFailureType?: string;
  analyzedAt: string;
}

export interface UploadSummary {
  id: string;
  fileName: string;
  rowCount: number;
  status: string;
  uploadedAt: string;
}

export interface DashboardSummary {
  totalWells: number;
  healthy: number;
  normal: number;
  degrading: number;
  critical: number;
  highRiskEsps: {
    wellId: string;
    wellName: string;
    healthScore: number;
    riskLevel: string;
    failureType: string | null;
  }[];
}

export interface ValidationIssue {
  type: 'error' | 'warning';
  category: string;
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

export interface UploadResponse {
  uploadId: string;
  recordsInserted: number;
  validation: ValidationResult;
}

export interface ContributingFactor {
  factor: string;
  score: number;
  weight: number;
  weighted_contribution: number;
  reason: string;
}

export interface RuleResult {
  rule_name: string;
  failure_type: string;
  severity: string;
  triggered_conditions: string[];
  explanation: string;
  recommendation: string;
}

export interface AnomalySummary {
  parameter: string;
  timestamp: string;
  actual_value: number;
  expected_min: number;
  expected_max: number;
  z_score: number | null;
  severity: string;
  explanation: string;
}

export interface AnalysisResult {
  predictionId?: string;
  well_id: string;
  health_score: number | null;
  risk_level: string | null;
  failure_probability: number | null;
  predicted_failure_type: string | null;
  estimated_failure_window: string | null;
  confidence: number | null;
  insufficient_data: boolean;
  missing_data_reason: string | null;
  contributing_factors: ContributingFactor[];
  anomalies: AnomalySummary[];
  recommendations: string[];
  explanation: string;
  health_breakdown?: Record<string, { score: number; weight: number; reason: string }>;
  rule_results: RuleResult[];
}

export interface ApiResponse<T> {
  status: 'success' | 'error';
  data?: T;
  message?: string;
  errors?: Record<string, string[]>;
}
