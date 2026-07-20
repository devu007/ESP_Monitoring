'use client';

import { AnalysisResult } from '@/types';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge, getRiskBadgeVariant, getHealthBadgeVariant } from '@/components/ui/badge';
import {
  AlertTriangle, CheckCircle, XCircle, TrendingDown,
  Lightbulb, ShieldAlert, Info,
} from 'lucide-react';

interface Props {
  result: AnalysisResult;
}

export function AnalysisResults({ result }: Props) {
  if (result.insufficient_data) {
    return (
      <Card>
        <div className="flex items-start gap-3 p-2">
          <Info className="w-6 h-6 text-yellow-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-yellow-400 font-medium">Insufficient Data</p>
            <p className="text-slate-400 text-sm mt-1">{result.missing_data_reason}</p>
            {result.recommendations.length > 0 && (
              <p className="text-slate-500 text-sm mt-2">{result.recommendations[0]}</p>
            )}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top-level scores */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <p className="text-xs text-slate-500">Health Score</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-3xl font-bold text-white">{result.health_score?.toFixed(0)}</span>
            <Badge variant={getHealthBadgeVariant(result.health_score ?? 0)}>
              {(result.health_score ?? 0) >= 90 ? 'Healthy' : (result.health_score ?? 0) >= 70 ? 'Normal' : (result.health_score ?? 0) >= 40 ? 'Degrading' : 'Critical'}
            </Badge>
          </div>
        </Card>
        <Card>
          <p className="text-xs text-slate-500">Risk Level</p>
          <div className="mt-1">
            <Badge variant={getRiskBadgeVariant(result.risk_level ?? 'LOW')} className="text-lg px-3 py-1">
              {result.risk_level}
            </Badge>
          </div>
        </Card>
        <Card>
          <p className="text-xs text-slate-500">Failure Probability</p>
          <p className="text-3xl font-bold text-white mt-1">
            {result.failure_probability != null ? `${(result.failure_probability * 100).toFixed(0)}%` : '—'}
          </p>
        </Card>
        <Card>
          <p className="text-xs text-slate-500">Failure Window</p>
          <p className="text-lg font-semibold text-white mt-1">
            {result.estimated_failure_window ?? 'None estimated'}
          </p>
          {result.predicted_failure_type && (
            <p className="text-xs text-slate-400 mt-1">{result.predicted_failure_type.replace(/_/g, ' ')}</p>
          )}
        </Card>
      </div>

      {/* Explanation */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-yellow-400" />
            <CardTitle>Analysis Summary</CardTitle>
          </div>
        </CardHeader>
        <p className="text-sm text-slate-300 leading-relaxed">{result.explanation}</p>
        {result.confidence != null && (
          <p className="text-xs text-slate-500 mt-3">Confidence: {(result.confidence * 100).toFixed(0)}%</p>
        )}
      </Card>

      {/* Health Breakdown */}
      {result.contributing_factors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Health Score Breakdown</CardTitle>
          </CardHeader>
          <div className="space-y-3">
            {result.contributing_factors.map((f) => (
              <div key={f.factor} className="flex items-center gap-3">
                <div className="w-36 text-xs text-slate-400 shrink-0">{f.factor}</div>
                <div className="flex-1">
                  <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        f.score >= 80 ? 'bg-green-500' : f.score >= 60 ? 'bg-yellow-500' : f.score >= 40 ? 'bg-orange-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${f.score}%` }}
                    />
                  </div>
                </div>
                <div className="w-12 text-right text-xs font-mono text-slate-300">{f.score.toFixed(0)}</div>
                <div className="w-10 text-right text-xs text-slate-500">{(f.weight * 100).toFixed(0)}%</div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Rule Engine Results */}
      {result.rule_results.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-red-400" />
              <CardTitle>Failure Detection Rules Triggered</CardTitle>
            </div>
          </CardHeader>
          <div className="space-y-4">
            {result.rule_results.map((rule, idx) => (
              <div key={idx} className="border border-slate-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold text-white">{rule.rule_name}</h4>
                  <Badge variant={
                    rule.severity === 'CRITICAL' ? 'critical' :
                    rule.severity === 'HIGH' ? 'degrading' : 'normal'
                  }>
                    {rule.severity}
                  </Badge>
                </div>
                <p className="text-sm text-slate-300 mb-2">{rule.explanation}</p>
                <ul className="list-disc list-inside text-xs text-slate-400 space-y-0.5 mb-2">
                  {rule.triggered_conditions.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
                <div className="flex items-start gap-2 mt-2 pt-2 border-t border-slate-700">
                  <Lightbulb className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-400">{rule.recommendation}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Anomalies */}
      {result.anomalies.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-400" />
              <CardTitle>Recent Anomalies ({result.anomalies.length})</CardTitle>
            </div>
          </CardHeader>
          <div className="max-h-64 overflow-y-auto space-y-2">
            {result.anomalies.map((a, idx) => (
              <div key={idx} className={`flex items-start gap-2 px-3 py-2 rounded text-xs ${
                a.severity === 'CRITICAL' ? 'bg-red-500/10 text-red-300' :
                a.severity === 'HIGH' ? 'bg-orange-500/10 text-orange-300' :
                'bg-yellow-500/10 text-yellow-300'
              }`}>
                {a.severity === 'CRITICAL' ? <XCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" /> :
                 <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />}
                <div>
                  <span className="font-medium">{a.parameter.replace(/_/g, ' ')}</span>
                  <span className="text-slate-500 ml-2">{new Date(a.timestamp).toLocaleDateString()}</span>
                  <p className="mt-0.5 text-slate-400">{a.explanation}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Recommendations */}
      {result.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <CardTitle>Recommendations</CardTitle>
            </div>
          </CardHeader>
          <ul className="space-y-2">
            {result.recommendations.map((rec, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-slate-300">
                <span className="text-blue-400 mt-1">•</span>
                {rec}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
