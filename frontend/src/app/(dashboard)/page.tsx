'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { DashboardSummary } from '@/types';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge, getRiskBadgeVariant, getHealthBadgeVariant } from '@/components/ui/badge';
import { Activity, Droplets, AlertTriangle, XCircle } from 'lucide-react';

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<DashboardSummary>('/wells/dashboard/summary')
      .then((res) => setSummary(res.data!))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  const stats = [
    { label: 'Total Wells', value: summary?.totalWells ?? 0, icon: Droplets, color: 'text-blue-400' },
    { label: 'Healthy', value: summary?.healthy ?? 0, icon: Activity, color: 'text-green-400' },
    { label: 'Degrading', value: summary?.degrading ?? 0, icon: AlertTriangle, color: 'text-yellow-400' },
    { label: 'Critical', value: summary?.critical ?? 0, icon: XCircle, color: 'text-red-400' },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-slate-400 mt-1">ESP fleet health overview</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">{stat.label}</p>
                  <p className="text-3xl font-bold text-white mt-1">{stat.value}</p>
                </div>
                <Icon className={`w-10 h-10 ${stat.color} opacity-80`} />
              </div>
            </Card>
          );
        })}
      </div>

      {summary?.highRiskEsps && summary.highRiskEsps.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>High Risk ESPs</CardTitle>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">Well</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">Health Score</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">Risk Level</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">Failure Type</th>
                </tr>
              </thead>
              <tbody>
                {summary.highRiskEsps.map((esp) => (
                  <tr key={esp.wellId} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                    <td className="py-3 px-4">
                      <Link href={`/wells/${esp.wellId}`} className="text-blue-400 hover:text-blue-300">
                        {esp.wellName}
                      </Link>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={getHealthBadgeVariant(esp.healthScore)}>
                        {esp.healthScore.toFixed(0)}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={getRiskBadgeVariant(esp.riskLevel)}>
                        {esp.riskLevel}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      {esp.failureType?.replace(/_/g, ' ') ?? '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {(!summary?.highRiskEsps || summary.highRiskEsps.length === 0) && (
        <Card>
          <div className="text-center py-12">
            <Activity className="w-12 h-12 text-slate-500 mx-auto mb-4" />
            <p className="text-slate-400">No high-risk ESPs detected.</p>
            <p className="text-slate-500 text-sm mt-1">
              Upload ESP data and run analysis to see health insights.
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
