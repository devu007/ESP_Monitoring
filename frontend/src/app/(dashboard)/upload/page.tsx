'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { api } from '@/lib/api';
import { Well, UploadResponse, ValidationIssue } from '@/types';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Upload, FileText, CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react';

export default function UploadPage() {
  const [wells, setWells] = useState<Well[]>([]);
  const [selectedWellId, setSelectedWellId] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [result, setResult] = useState<UploadResponse | null>(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.get<Well[]>('/wells')
      .then((res) => {
        setWells(res.data!);
        if (res.data!.length > 0) setSelectedWellId(res.data![0]!.id);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleUpload = useCallback(async (file: File) => {
    if (!selectedWellId) {
      setError('Please select a well first');
      return;
    }
    if (!file.name.endsWith('.csv')) {
      setError('Only CSV files are accepted');
      return;
    }

    setError('');
    setResult(null);
    setUploading(true);

    try {
      const res = await api.uploadFile<UploadResponse>(`/wells/${selectedWellId}/upload`, file);
      setResult(res.data!);
    } catch (err: any) {
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  }, [selectedWellId]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  }, [handleUpload]);

  const onFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
    e.target.value = '';
  }, [handleUpload]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  const errorIssues = result?.validation.issues.filter((i) => i.type === 'error') ?? [];
  const warningIssues = result?.validation.issues.filter((i) => i.type === 'warning') ?? [];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Upload ESP Data</h1>
        <p className="text-slate-400 mt-1">Upload historical CSV data for analysis</p>
      </div>

      {/* Well Selector */}
      <Card className="mb-6">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-slate-300">Target Well:</label>
          <select
            value={selectedWellId}
            onChange={(e) => { setSelectedWellId(e.target.value); setResult(null); }}
            className="flex-1 max-w-md px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {wells.length === 0 && <option value="">No wells available</option>}
            {wells.map((w) => (
              <option key={w.id} value={w.id}>{w.name} ({w.field?.name})</option>
            ))}
          </select>
        </div>
      </Card>

      {/* Drop Zone */}
      <Card className="mb-6">
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${
            dragOver
              ? 'border-blue-400 bg-blue-500/10'
              : 'border-slate-600 hover:border-slate-500 hover:bg-slate-700/30'
          }`}
        >
          <input ref={fileInputRef} type="file" accept=".csv" onChange={onFileSelect} className="hidden" />
          {uploading ? (
            <div>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4" />
              <p className="text-slate-300 text-lg font-medium">Processing CSV...</p>
              <p className="text-slate-500 text-sm mt-1">Validating and inserting records</p>
            </div>
          ) : (
            <div>
              <Upload className="w-12 h-12 text-slate-500 mx-auto mb-4" />
              <p className="text-slate-300 text-lg font-medium">Drop your CSV file here or click to browse</p>
              <p className="text-slate-500 text-sm mt-2">Maximum file size: 50MB</p>
            </div>
          )}
        </div>
      </Card>

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400">
          {error}
        </div>
      )}

      {/* Results */}
      {result && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <div className="flex items-center gap-3">
                <FileText className="w-8 h-8 text-blue-400" />
                <div>
                  <p className="text-xs text-slate-500">Total Rows</p>
                  <p className="text-xl font-bold text-white">{result.validation.totalRows}</p>
                </div>
              </div>
            </Card>
            <Card>
              <div className="flex items-center gap-3">
                <CheckCircle className="w-8 h-8 text-green-400" />
                <div>
                  <p className="text-xs text-slate-500">Valid Rows</p>
                  <p className="text-xl font-bold text-white">{result.validation.validRows}</p>
                </div>
              </div>
            </Card>
            <Card>
              <div className="flex items-center gap-3">
                <XCircle className="w-8 h-8 text-red-400" />
                <div>
                  <p className="text-xs text-slate-500">Invalid Rows</p>
                  <p className="text-xl font-bold text-white">{result.validation.invalidRows}</p>
                </div>
              </div>
            </Card>
            <Card>
              <div className="flex items-center gap-3">
                <CheckCircle className="w-8 h-8 text-green-400" />
                <div>
                  <p className="text-xs text-slate-500">Records Inserted</p>
                  <p className="text-xl font-bold text-white">{result.recordsInserted}</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Detected Columns */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Detected Columns</CardTitle>
            </CardHeader>
            <div className="flex flex-wrap gap-2">
              {result.validation.columns.map((col) => (
                <Badge
                  key={col}
                  variant={
                    result.validation.missingRequiredColumns.includes(col) ? 'critical'
                    : result.validation.missingOptionalColumns.includes(col) ? 'degrading'
                    : 'healthy'
                  }
                >
                  {col}
                </Badge>
              ))}
            </div>
            {result.validation.missingOptionalColumns.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-700">
                <p className="text-xs text-slate-500 mb-2">Missing optional columns (related metrics will not be computed):</p>
                <div className="flex flex-wrap gap-2">
                  {result.validation.missingOptionalColumns.map((col) => (
                    <Badge key={col} variant="degrading">{col}</Badge>
                  ))}
                </div>
              </div>
            )}
          </Card>

          {/* Errors */}
          {errorIssues.length > 0 && (
            <Card className="mb-6">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <XCircle className="w-5 h-5 text-red-400" />
                  <CardTitle>Errors ({errorIssues.length})</CardTitle>
                </div>
              </CardHeader>
              <div className="max-h-64 overflow-y-auto space-y-1">
                {errorIssues.map((issue, idx) => (
                  <IssueRow key={idx} issue={issue} />
                ))}
              </div>
            </Card>
          )}

          {/* Warnings */}
          {warningIssues.length > 0 && (
            <Card className="mb-6">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-400" />
                  <CardTitle>Warnings ({warningIssues.length})</CardTitle>
                </div>
              </CardHeader>
              <div className="max-h-64 overflow-y-auto space-y-1">
                {warningIssues.map((issue, idx) => (
                  <IssueRow key={idx} issue={issue} />
                ))}
              </div>
            </Card>
          )}

          {/* Overall Status */}
          <Card>
            <div className="flex items-center gap-3">
              {result.validation.isValid ? (
                <>
                  <CheckCircle className="w-6 h-6 text-green-400" />
                  <p className="text-green-400 font-medium">
                    Upload successful. {result.recordsInserted} records inserted.
                  </p>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-6 h-6 text-yellow-400" />
                  <p className="text-yellow-400 font-medium">
                    Upload completed with issues. {result.recordsInserted} valid records inserted, {result.validation.invalidRows} rows skipped.
                  </p>
                </>
              )}
            </div>
          </Card>
        </>
      )}

      {/* Expected Format */}
      {!result && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Info className="w-5 h-5 text-blue-400" />
              <CardTitle>Expected CSV Format</CardTitle>
            </div>
          </CardHeader>
          <p className="text-sm text-slate-400 mb-4">
            The CSV must contain a <code className="text-blue-400">timestamp</code> column (required). All other columns are optional.
          </p>
          <div className="bg-slate-900 rounded-lg p-4 overflow-x-auto">
            <code className="text-xs text-slate-300">
              timestamp, liquid_rate, oil_rate, water_cut, gas_rate, gor, intake_pressure, discharge_pressure, annulus_pressure, motor_current, motor_voltage, motor_temperature, pump_speed, frequency, vibration, power_factor
            </code>
          </div>
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            {[
              { label: 'timestamp', desc: 'ISO 8601 or parseable date' },
              { label: 'liquid_rate', desc: 'bpd' },
              { label: 'oil_rate', desc: 'bpd' },
              { label: 'water_cut', desc: '0-1 fraction' },
              { label: 'motor_current', desc: 'amps' },
              { label: 'motor_temperature', desc: 'degrees F' },
              { label: 'intake_pressure', desc: 'psi' },
              { label: 'vibration', desc: 'g or in/s' },
            ].map((item) => (
              <div key={item.label} className="bg-slate-700/50 rounded-lg p-2">
                <p className="font-mono text-blue-400">{item.label}</p>
                <p className="text-slate-500 mt-0.5">{item.desc}</p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function IssueRow({ issue }: { issue: ValidationIssue }) {
  return (
    <div className={`flex items-start gap-2 px-3 py-2 rounded text-sm ${
      issue.type === 'error' ? 'bg-red-500/5 text-red-300' : 'bg-yellow-500/5 text-yellow-300'
    }`}>
      {issue.type === 'error' ? (
        <XCircle className="w-4 h-4 mt-0.5 shrink-0" />
      ) : (
        <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
      )}
      <span>{issue.message}</span>
    </div>
  );
}
