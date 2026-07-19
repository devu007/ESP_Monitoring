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

export interface ApiResponse<T> {
  status: 'success' | 'error';
  data?: T;
  message?: string;
  errors?: Record<string, string[]>;
}
