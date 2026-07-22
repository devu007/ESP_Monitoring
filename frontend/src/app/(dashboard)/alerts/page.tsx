'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, CheckCheck, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';

interface Alert {
  id: string;
  wellId: string;
  well: { id: string; name: string };
  severity: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  triggeredAt: string;
}

interface AlertCounts {
  total: number;
  unread: number;
  critical: number;
  high: number;
}

const severityVariant = (s: string) => {
  switch (s) {
    case 'CRITICAL': return 'critical' as const;
    case 'HIGH': return 'degrading' as const;
    case 'WARNING': return 'normal' as const;
    default: return 'default' as const;
  }
};

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [counts, setCounts] = useState<AlertCounts | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [severityFilter, setSeverityFilter] = useState('');

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '15' });
      if (severityFilter) params.set('severity', severityFilter);
      const [alertRes, countRes] = await Promise.all([
        api.get<{ alerts: Alert[]; pagination: { totalPages: number } }>(`/alerts?${params}`),
        api.get<AlertCounts>('/alerts/counts'),
      ]);
      setAlerts(alertRes.data!.alerts);
      setTotalPages(alertRes.data!.pagination.totalPages);
      setCounts(countRes.data!);
    } catch { }
    setLoading(false);
  }, [page, severityFilter]);

  useEffect(() => { fetchAlerts(); }, [fetchAlerts]);

  const markAllRead = async () => {
    await api.put('/alerts/read-all');
    fetchAlerts();
  };

  const dismissAlert = async (id: string) => {
    await api.delete(`/alerts/${id}`);
    fetchAlerts();
  };

  const markRead = async (id: string) => {
    await api.put(`/alerts/${id}/read`);
    fetchAlerts();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Alerts</h1>
          <p className="text-slate-400 mt-1">
            {counts ? `${counts.unread} unread · ${counts.critical} critical · ${counts.high} high` : 'Loading...'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={severityFilter}
            onChange={(e) => { setSeverityFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="WARNING">Warning</option>
            <option value="INFO">Info</option>
          </select>
          <Button variant="secondary" size="sm" onClick={markAllRead}>
            <CheckCheck className="w-4 h-4 mr-1" /> Mark All Read
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
        </div>
      ) : alerts.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <Bell className="w-12 h-12 text-slate-500 mx-auto mb-4" />
            <p className="text-slate-400">No alerts found.</p>
            <p className="text-slate-500 text-sm mt-1">Alerts are generated when you run analysis on well data.</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-2">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`bg-slate-800/50 border rounded-xl p-4 flex items-start gap-4 transition-colors ${
                alert.isRead ? 'border-slate-700/50 opacity-70' : 'border-slate-600'
              }`}
            >
              <div className="mt-0.5">
                <Badge variant={severityVariant(alert.severity)}>{alert.severity}</Badge>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm font-semibold text-white">{alert.title}</h3>
                  <span className="text-xs text-slate-500">{alert.type.replace(/_/g, ' ')}</span>
                </div>
                <p className="text-sm text-slate-400 line-clamp-2">{alert.message}</p>
                <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                  <Link href={`/wells/${alert.wellId}`} className="text-blue-400 hover:text-blue-300">
                    {alert.well.name}
                  </Link>
                  <span>{new Date(alert.triggeredAt).toLocaleString()}</span>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {!alert.isRead && (
                  <button onClick={() => markRead(alert.id)} className="p-1.5 text-slate-500 hover:text-blue-400 transition-colors" title="Mark as read">
                    <CheckCheck className="w-4 h-4" />
                  </button>
                )}
                <button onClick={() => dismissAlert(alert.id)} className="p-1.5 text-slate-500 hover:text-red-400 transition-colors" title="Dismiss">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-6">
          <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm text-slate-400">Page {page} of {totalPages}</span>
          <Button variant="ghost" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
