'use client';

import { useEffect, useState, FormEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Well, Esp, AnalysisResult } from '@/types';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge, getRiskBadgeVariant, getHealthBadgeVariant } from '@/components/ui/badge';
import { ArrowLeft, Settings, Activity, Trash2, Eye, Play, Loader2 } from 'lucide-react';
import { DataViewer } from '@/components/wells/data-viewer';
import { AnalysisResults } from '@/components/wells/analysis-results';
import { WellCharts } from '@/components/wells/well-charts';

export default function WellDetailPage() {
  const params = useParams();
  const router = useRouter();
  const wellId = params.id as string;

  const [well, setWell] = useState<Well | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEspForm, setShowEspForm] = useState(false);
  const [espSubmitting, setEspSubmitting] = useState(false);
  const [espError, setEspError] = useState('');
  const [viewingUploadId, setViewingUploadId] = useState<string | null>(null);
  const [selectedAnalysisUploadId, setSelectedAnalysisUploadId] = useState<string>('');
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState('');

  const [espForm, setEspForm] = useState({
    manufacturer: '',
    model: '',
    installationDate: '',
    pumpStages: '',
    ratedPower: '',
    ratedSpeed: '',
    frequencyMin: '',
    frequencyMax: '',
    motorRating: '',
    designFlowMin: '',
    designFlowMax: '',
  });

  const fetchWell = () => {
    api.get<Well>(`/wells/${wellId}`)
      .then((res) => setWell(res.data!))
      .catch(() => router.push('/wells'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchWell(); }, [wellId]);

  const fetchSavedAnalysis = async (uploadId: string) => {
    try {
      const res = await api.get<any>(`/wells/${wellId}/health?uploadId=${uploadId}`);
      if (res.data) {
        const saved = res.data;
        setAnalysisResult({
          well_id: wellId,
          health_score: saved.healthScore,
          risk_level: saved.riskLevel,
          failure_probability: saved.failureProbability,
          predicted_failure_type: saved.predictedFailureType,
          estimated_failure_window: saved.estimatedFailureWindow,
          confidence: saved.confidence,
          insufficient_data: saved.insufficientData,
          missing_data_reason: saved.missingDataReason,
          contributing_factors: saved.contributingFactors ?? [],
          anomalies: saved.anomalySummary ?? [],
          recommendations: saved.recommendations ?? [],
          explanation: saved.explanation ?? '',
          rule_results: [],
        });
      }
    } catch {
      // No saved result — that's fine, user can run analysis
    }
  };

  const handleDatasetChange = (uploadId: string) => {
    setSelectedAnalysisUploadId(uploadId);
    setAnalysisResult(null);
    setAnalysisError('');
    if (uploadId) {
      fetchSavedAnalysis(uploadId);
    }
  };

  const handleRunAnalysis = async () => {
    if (!selectedAnalysisUploadId) {
      setAnalysisError('Please select a dataset to analyze.');
      return;
    }
    setAnalyzing(true);
    setAnalysisError('');
    setAnalysisResult(null);
    try {
      const res = await api.post<AnalysisResult>(`/wells/${wellId}/analyze`, {
        uploadId: selectedAnalysisUploadId,
      });
      setAnalysisResult(res.data!);
    } catch (err: any) {
      setAnalysisError(err.message || 'Analysis failed');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleEspSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setEspError('');
    setEspSubmitting(true);
    try {
      const body = {
        manufacturer: espForm.manufacturer,
        model: espForm.model,
        installationDate: new Date(espForm.installationDate).toISOString(),
        pumpStages: parseInt(espForm.pumpStages),
        ratedPower: parseFloat(espForm.ratedPower),
        ratedSpeed: parseFloat(espForm.ratedSpeed),
        frequencyMin: parseFloat(espForm.frequencyMin),
        frequencyMax: parseFloat(espForm.frequencyMax),
        motorRating: parseFloat(espForm.motorRating),
        designFlowMin: parseFloat(espForm.designFlowMin),
        designFlowMax: parseFloat(espForm.designFlowMax),
      };
      const method = well?.esp ? 'put' : 'post';
      await api[method](`/wells/${wellId}/esp`, body);
      setShowEspForm(false);
      fetchWell();
    } catch (err: any) {
      setEspError(err.message || 'Failed to save ESP configuration');
    } finally {
      setEspSubmitting(false);
    }
  };

  const populateEspForm = (esp: Esp) => {
    setEspForm({
      manufacturer: esp.manufacturer,
      model: esp.model,
      installationDate: esp.installationDate.split('T')[0]!,
      pumpStages: String(esp.pumpStages),
      ratedPower: String(esp.ratedPower),
      ratedSpeed: String(esp.ratedSpeed),
      frequencyMin: String(esp.frequencyMin),
      frequencyMax: String(esp.frequencyMax),
      motorRating: String(esp.motorRating),
      designFlowMin: String(esp.designFlowMin),
      designFlowMax: String(esp.designFlowMax),
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (!well) return null;

  const prediction = well.predictions?.[0];

  const displayScore = analysisResult ? analysisResult.health_score : prediction?.healthScore;
  const displayRisk = analysisResult ? analysisResult.risk_level : prediction?.riskLevel;
  const displayFailureType = analysisResult ? analysisResult.predicted_failure_type : prediction?.predictedFailureType;
  const displayFailureProb = analysisResult ? analysisResult.failure_probability : prediction?.failureProbability;
  const displayFailureWindow = analysisResult ? analysisResult.estimated_failure_window : null;
  const hasDisplay = displayScore != null;

  return (
    <div>
      <button onClick={() => router.push('/wells')} className="flex items-center gap-2 text-slate-400 hover:text-slate-200 mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Wells
      </button>

      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">{well.name}</h1>
          <p className="text-slate-400 mt-1">Field: {well.field?.name ?? 'Unknown'}</p>
        </div>
        <Badge variant={well.status === 'ACTIVE' ? 'healthy' : 'default'}>{well.status}</Badge>
      </div>

      {/* Health Summary — driven by selected dataset analysis or latest prediction */}
      {hasDisplay && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <p className="text-sm text-slate-400 mb-1">Health Score</p>
            <div className="flex items-center gap-3">
              <span className="text-4xl font-bold text-white">{displayScore!.toFixed(0)}</span>
              <Badge variant={getHealthBadgeVariant(displayScore!)}>
                {displayScore! >= 90 ? 'Healthy' : displayScore! >= 70 ? 'Normal' : displayScore! >= 40 ? 'Degrading' : 'Critical'}
              </Badge>
            </div>
          </Card>
          <Card>
            <p className="text-sm text-slate-400 mb-1">Risk Level</p>
            <Badge variant={getRiskBadgeVariant(displayRisk ?? 'LOW')} className="text-lg px-4 py-1">
              {displayRisk}
            </Badge>
          </Card>
          <Card>
            <p className="text-sm text-slate-400 mb-1">Failure Probability</p>
            <p className="text-3xl font-bold text-white">
              {displayFailureProb != null ? `${(displayFailureProb * 100).toFixed(0)}%` : '—'}
            </p>
          </Card>
          <Card>
            <p className="text-sm text-slate-400 mb-1">Predicted Failure</p>
            <p className="text-lg font-semibold text-white">
              {displayFailureType?.replace(/_/g, ' ') ?? 'None detected'}
            </p>
            {displayFailureWindow && (
              <p className="text-xs text-slate-400 mt-1">Window: {displayFailureWindow}</p>
            )}
          </Card>
        </div>
      )}

      {!hasDisplay && (
        <Card className="mb-8">
          <div className="text-center py-8">
            <Activity className="w-10 h-10 text-slate-500 mx-auto mb-3" />
            <p className="text-slate-400">No analysis data available yet.</p>
            <p className="text-sm text-slate-500 mt-1">Upload ESP data and run analysis to see health insights.</p>
          </div>
        </Card>
      )}

      {/* ESP Configuration */}
      <Card className="mb-8">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>ESP Configuration</CardTitle>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                if (well.esp) populateEspForm(well.esp);
                setShowEspForm(!showEspForm);
              }}
            >
              <Settings className="w-4 h-4 mr-2" />
              {well.esp ? 'Edit' : 'Configure'} ESP
            </Button>
          </div>
        </CardHeader>

        {well.esp && !showEspForm ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Manufacturer', value: well.esp.manufacturer },
              { label: 'Model', value: well.esp.model },
              { label: 'Installation Date', value: new Date(well.esp.installationDate).toLocaleDateString() },
              { label: 'Pump Stages', value: well.esp.pumpStages },
              { label: 'Rated Power', value: `${well.esp.ratedPower} kW` },
              { label: 'Rated Speed', value: `${well.esp.ratedSpeed} RPM` },
              { label: 'Frequency Range', value: `${well.esp.frequencyMin}-${well.esp.frequencyMax} Hz` },
              { label: 'Motor Rating', value: `${well.esp.motorRating} HP` },
              { label: 'Design Flow Range', value: `${well.esp.designFlowMin}-${well.esp.designFlowMax} bpd` },
            ].map((item) => (
              <div key={item.label}>
                <p className="text-xs text-slate-500">{item.label}</p>
                <p className="text-sm text-white font-medium mt-0.5">{item.value}</p>
              </div>
            ))}
          </div>
        ) : !well.esp && !showEspForm ? (
          <p className="text-slate-400">No ESP configured for this well. Click &quot;Configure ESP&quot; to add one.</p>
        ) : null}

        {showEspForm && (
          <div className="mt-4">
            {espError && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                {espError}
              </div>
            )}
            <form onSubmit={handleEspSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="w-full">
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Manufacturer</label>
                  <select
                    value={espForm.manufacturer}
                    onChange={(e) => setEspForm({ ...espForm, manufacturer: e.target.value })}
                    required
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  >
                    <option value="">Select manufacturer</option>
                    <option value="Schlumberger (REDA)">Schlumberger (REDA)</option>
                    <option value="Baker Hughes (Centrilift)">Baker Hughes (Centrilift)</option>
                    <option value="Halliburton (Summit ESP)">Halliburton (Summit ESP)</option>
                    <option value="Borets">Borets</option>
                    <option value="Weatherford">Weatherford</option>
                    <option value="NOV (Moyno)">NOV (Moyno)</option>
                    <option value="Novomet">Novomet</option>
                    <option value="Alkhorayef">Alkhorayef</option>
                    <option value="Lufkin (GE Oil & Gas)">Lufkin (GE Oil &amp; Gas)</option>
                    <option value="DNow (DistributionNow)">DNow (DistributionNow)</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="w-full">
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Model</label>
                  <select
                    value={espForm.model}
                    onChange={(e) => setEspForm({ ...espForm, model: e.target.value })}
                    required
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  >
                    <option value="">Select model</option>
                    <optgroup label="Centrifugal Pump">
                      <option value="DN Series">DN Series</option>
                      <option value="GN Series">GN Series</option>
                      <option value="TD Series">TD Series</option>
                      <option value="TE Series">TE Series</option>
                      <option value="P Series">P Series</option>
                      <option value="S Series">S Series</option>
                    </optgroup>
                    <optgroup label="Mixed Flow Pump">
                      <option value="MF Series">MF Series</option>
                      <option value="HC Series">HC Series</option>
                    </optgroup>
                    <optgroup label="High Volume">
                      <option value="HV Series">HV Series</option>
                      <option value="WC Series">WC Series</option>
                    </optgroup>
                    <optgroup label="Gas Handling">
                      <option value="GH Series">GH Series</option>
                      <option value="AGH Series">AGH Series</option>
                      <option value="Poseidon">Poseidon</option>
                    </optgroup>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <Input label="Installation Date" type="date" value={espForm.installationDate} onChange={(e) => setEspForm({ ...espForm, installationDate: e.target.value })} required />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="w-full">
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Pump Stages</label>
                  <select
                    value={espForm.pumpStages}
                    onChange={(e) => setEspForm({ ...espForm, pumpStages: e.target.value })}
                    required
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  >
                    <option value="">Select stages</option>
                    {[10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 120, 140, 160, 180, 200, 250, 300, 350, 400, 450, 500].map((n) => (
                      <option key={n} value={String(n)}>{n} stages</option>
                    ))}
                  </select>
                </div>
                <Input label="Rated Power (kW)" type="number" step="0.1" value={espForm.ratedPower} onChange={(e) => setEspForm({ ...espForm, ratedPower: e.target.value })} required />
                <Input label="Rated Speed (RPM)" type="number" value={espForm.ratedSpeed} onChange={(e) => setEspForm({ ...espForm, ratedSpeed: e.target.value })} required />
                <Input label="Motor Rating (HP)" type="number" step="0.1" value={espForm.motorRating} onChange={(e) => setEspForm({ ...espForm, motorRating: e.target.value })} required />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Input label="Frequency Min (Hz)" type="number" step="0.1" value={espForm.frequencyMin} onChange={(e) => setEspForm({ ...espForm, frequencyMin: e.target.value })} required />
                <Input label="Frequency Max (Hz)" type="number" step="0.1" value={espForm.frequencyMax} onChange={(e) => setEspForm({ ...espForm, frequencyMax: e.target.value })} required />
                <Input label="Design Flow Min (bpd)" type="number" step="0.1" value={espForm.designFlowMin} onChange={(e) => setEspForm({ ...espForm, designFlowMin: e.target.value })} required />
                <Input label="Design Flow Max (bpd)" type="number" step="0.1" value={espForm.designFlowMax} onChange={(e) => setEspForm({ ...espForm, designFlowMax: e.target.value })} required />
              </div>
              <div className="flex gap-3">
                <Button type="submit" isLoading={espSubmitting}>{well.esp ? 'Update' : 'Save'} ESP Config</Button>
                <Button type="button" variant="secondary" onClick={() => setShowEspForm(false)}>Cancel</Button>
              </div>
            </form>
          </div>
        )}
      </Card>

      {/* Recent Uploads */}
      {well.uploads && well.uploads.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Uploads</CardTitle>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-2 px-4 text-slate-400 font-medium">File</th>
                  <th className="text-left py-2 px-4 text-slate-400 font-medium">Rows</th>
                  <th className="text-left py-2 px-4 text-slate-400 font-medium">Status</th>
                  <th className="text-left py-2 px-4 text-slate-400 font-medium">Uploaded</th>
                  <th className="text-right py-2 px-4 text-slate-400 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {well.uploads.map((upload) => (
                  <tr key={upload.id} className={`border-b border-slate-700/50 ${viewingUploadId === upload.id ? 'bg-blue-500/10' : ''}`}>
                    <td className="py-2 px-4">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-300">{upload.fileName}</span>
                        {upload.status === 'COMPLETED' && (
                          <button
                            onClick={() => setViewingUploadId(viewingUploadId === upload.id ? null : upload.id)}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                              viewingUploadId === upload.id
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                            }`}
                            title="View uploaded data"
                          >
                            <Eye className="w-3 h-3" />
                            {viewingUploadId === upload.id ? 'Hide' : 'View'}
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="py-2 px-4 text-slate-300">{upload.rowCount}</td>
                    <td className="py-2 px-4">
                      <Badge variant={upload.status === 'COMPLETED' ? 'healthy' : upload.status === 'FAILED' ? 'critical' : 'default'}>
                        {upload.status}
                      </Badge>
                    </td>
                    <td className="py-2 px-4 text-slate-400">{new Date(upload.uploadedAt).toLocaleString()}</td>
                    <td className="py-2 px-4 text-right">
                      <button
                        onClick={async () => {
                          if (!confirm('Delete this upload and all its sensor data?')) return;
                          try {
                            await api.delete(`/wells/uploads/${upload.id}`);
                            fetchWell();
                          } catch {
                            alert('Failed to delete upload');
                          }
                        }}
                        className="text-slate-500 hover:text-red-400 transition-colors p-1"
                        title="Delete upload"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Sensor Data Viewer */}
      {viewingUploadId && (
        <DataViewer wellId={wellId} uploadId={viewingUploadId} />
      )}

      {/* Analysis Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-purple-400" />
            <CardTitle>ESP Health Analysis</CardTitle>
          </div>
        </CardHeader>
        <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
          <div className="flex-1 w-full sm:max-w-md">
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Select Dataset</label>
            <select
              value={selectedAnalysisUploadId}
              onChange={(e) => handleDatasetChange(e.target.value)}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Choose an uploaded dataset --</option>
              {well.uploads?.filter(u => u.status === 'COMPLETED').map((upload) => (
                <option key={upload.id} value={upload.id}>
                  {upload.fileName} ({upload.rowCount} rows — {new Date(upload.uploadedAt).toLocaleDateString()})
                </option>
              ))}
            </select>
          </div>
          <Button onClick={handleRunAnalysis} disabled={analyzing || !selectedAnalysisUploadId} variant="primary">
            {analyzing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Analyzing...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Run Analysis
              </>
            )}
          </Button>
        </div>
        {!analysisResult && !analyzing && !analysisError && (
          <p className="text-sm text-slate-500 mt-4">
            Select a dataset above and click &quot;Run Analysis&quot; to compute health score, detect anomalies, and identify failure risks for that specific upload.
          </p>
        )}
        {analysisError && (
          <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
            {analysisError}
          </div>
        )}
      </Card>

      {analysisResult && (
        <AnalysisResults result={analysisResult} />
      )}

      {/* Time-Series Charts */}
      {selectedAnalysisUploadId && (
        <WellCharts wellId={wellId} uploadId={selectedAnalysisUploadId} />
      )}
    </div>
  );
}
