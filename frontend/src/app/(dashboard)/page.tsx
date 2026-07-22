'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { DashboardSummary } from '@/types';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge, getRiskBadgeVariant, getHealthBadgeVariant } from '@/components/ui/badge';
import { Activity, Droplets, AlertTriangle, XCircle, Bell, CheckCircle, Shield } from 'lucide-react';

interface AlertCounts { total: number; unread: number; critical: number; high: number }

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [alertCounts, setAlertCounts] = useState<AlertCounts | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<DashboardSummary>('/wells/dashboard/summary'),
      api.get<AlertCounts>('/alerts/counts'),
    ])
      .then(([sumRes, alertRes]) => {
        setSummary(sumRes.data!);
        setAlertCounts(alertRes.data!);
      })
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
    { label: 'Total Wells', value: summary?.totalWells ?? 0, icon: Droplets, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { label: 'Healthy', value: summary?.healthy ?? 0, icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/10' },
    { label: 'Degrading', value: summary?.degrading ?? 0, icon: AlertTriangle, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
    { label: 'Critical', value: summary?.critical ?? 0, icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10' },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-slate-400 mt-1">ESP fleet health overview</p>
      </div>

      {/* Stats Row */}
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
                <div className={`p-3 rounded-xl ${stat.bg}`}>
                  <Icon className={`w-7 h-7 ${stat.color}`} />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Alert Summary Cards */}
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-orange-500/10">
              <Bell className="w-6 h-6 text-orange-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{alertCounts?.unread ?? 0}</p>
              <p className="text-xs text-slate-400">Unread Alerts</p>
            </div>
          </div>
          <Link href="/alerts" className="block mt-3 text-xs text-blue-400 hover:text-blue-300">
            View all alerts →
          </Link>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-red-500/10">
              <Shield className="w-6 h-6 text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{alertCounts?.critical ?? 0}</p>
              <p className="text-xs text-slate-400">Critical Alerts</p>
            </div>
          </div>
          <Link href="/alerts?severity=CRITICAL" className="block mt-3 text-xs text-blue-400 hover:text-blue-300">
            View critical →
          </Link>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-slate-500/10">
              <Activity className="w-6 h-6 text-slate-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{summary?.normal ?? 0}</p>
              <p className="text-xs text-slate-400">Normal Wells</p>
            </div>
          </div>
          <Link href="/wells" className="block mt-3 text-xs text-blue-400 hover:text-blue-300">
            View all wells →
          </Link>
        </Card>
      </div>

      {/* High Risk ESPs */}
      {summary?.highRiskEsps && summary.highRiskEsps.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-400" />
              <CardTitle>High Risk ESPs</CardTitle>
            </div>
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
                  <tr key={esp.wellId} className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors">
                    <td className="py-3 px-4">
                      <Link href={`/wells/${esp.wellId}`} className="text-blue-400 hover:text-blue-300 font-medium">
                        {esp.wellName}
                      </Link>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              esp.healthScore >= 70 ? 'bg-blue-500' : esp.healthScore >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${esp.healthScore}%` }}
                          />
                        </div>
                        <Badge variant={getHealthBadgeVariant(esp.healthScore)}>
                          {esp.healthScore.toFixed(0)}
                        </Badge>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={getRiskBadgeVariant(esp.riskLevel)}>
                        {esp.riskLevel}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      {esp.failureType?.replace(/_/g, ' ') ?? '—'}
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
            <CheckCircle className="w-12 h-12 text-green-500/50 mx-auto mb-4" />
            <p className="text-slate-400">All ESPs are operating within normal parameters.</p>
            <p className="text-slate-500 text-sm mt-1">
              Upload ESP data and run analysis to see health insights.
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
