'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Database, ChevronLeft, ChevronRight, ArrowUpDown } from 'lucide-react';

interface SensorReading {
  id: string;
  timestamp: string;
  liquidRate: number | null;
  oilRate: number | null;
  waterCut: number | null;
  gasRate: number | null;
  gor: number | null;
  intakePressure: number | null;
  dischargePressure: number | null;
  annulusPressure: number | null;
  motorCurrent: number | null;
  motorVoltage: number | null;
  motorTemperature: number | null;
  pumpSpeed: number | null;
  frequency: number | null;
  vibration: number | null;
  powerFactor: number | null;
}

interface Pagination {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

const COLUMNS: { key: keyof SensorReading; label: string; unit: string }[] = [
  { key: 'timestamp', label: 'Timestamp', unit: '' },
  { key: 'liquidRate', label: 'Liquid Rate', unit: 'bpd' },
  { key: 'oilRate', label: 'Oil Rate', unit: 'bpd' },
  { key: 'waterCut', label: 'Water Cut', unit: '' },
  { key: 'gasRate', label: 'Gas Rate', unit: 'mcf/d' },
  { key: 'gor', label: 'GOR', unit: 'scf/bbl' },
  { key: 'intakePressure', label: 'Intake Press.', unit: 'psi' },
  { key: 'dischargePressure', label: 'Disch. Press.', unit: 'psi' },
  { key: 'annulusPressure', label: 'Annulus Press.', unit: 'psi' },
  { key: 'motorCurrent', label: 'Motor Current', unit: 'A' },
  { key: 'motorVoltage', label: 'Motor Voltage', unit: 'V' },
  { key: 'motorTemperature', label: 'Motor Temp.', unit: '°F' },
  { key: 'pumpSpeed', label: 'Pump Speed', unit: 'RPM' },
  { key: 'frequency', label: 'Frequency', unit: 'Hz' },
  { key: 'vibration', label: 'Vibration', unit: 'g' },
  { key: 'powerFactor', label: 'Power Factor', unit: '' },
];

export function DataViewer({ wellId, uploadId }: { wellId: string; uploadId?: string }) {
  const [readings, setReadings] = useState<SensorReading[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [page, setPage] = useState(1);

  useEffect(() => { setPage(1); }, [uploadId]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      let url = `/wells/${wellId}/readings?page=${page}&pageSize=50&sort=${sortOrder}`;
      if (uploadId) url += `&uploadId=${uploadId}`;
      const res = await api.get<{ readings: SensorReading[]; pagination: Pagination }>(url);
      setReadings(res.data!.readings);
      setPagination(res.data!.pagination);
    } catch {
      // no data
    } finally {
      setLoading(false);
    }
  }, [wellId, uploadId, page, sortOrder]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading && !pagination) {
    return (
      <Card>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500" />
        </div>
      </Card>
    );
  }

  if (!pagination || pagination.totalCount === 0) {
    return (
      <Card>
        <div className="text-center py-12">
          <Database className="w-10 h-10 text-slate-500 mx-auto mb-3" />
          <p className="text-slate-400">No sensor data uploaded yet.</p>
        </div>
      </Card>
    );
  }

  const formatValue = (key: keyof SensorReading, value: any): string => {
    if (value === null || value === undefined) return '—';
    if (key === 'timestamp') return new Date(value).toLocaleString();
    if (typeof value === 'number') {
      return value % 1 === 0 ? value.toString() : value.toFixed(2);
    }
    return String(value);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle>Sensor Data</CardTitle>
            <span className="text-xs text-slate-500 bg-slate-700 px-2 py-0.5 rounded">
              {pagination.totalCount.toLocaleString()} records
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc'); setPage(1); }}
          >
            <ArrowUpDown className="w-4 h-4 mr-1" />
            {sortOrder === 'desc' ? 'Newest first' : 'Oldest first'}
          </Button>
        </div>
      </CardHeader>
      <div className="overflow-x-auto relative">
        {loading && (
          <div className="absolute inset-0 bg-slate-800/50 flex items-center justify-center z-10">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500" />
          </div>
        )}
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-700">
              {COLUMNS.map((col) => (
                <th key={col.key} className="text-left py-2 px-3 text-slate-400 font-medium whitespace-nowrap">
                  {col.label}
                  {col.unit && <span className="text-slate-600 ml-1">({col.unit})</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {readings.map((row) => (
              <tr key={row.id} className="border-b border-slate-700/30 hover:bg-slate-700/20">
                {COLUMNS.map((col) => (
                  <td
                    key={col.key}
                    className={`py-1.5 px-3 whitespace-nowrap ${
                      row[col.key] === null ? 'text-slate-600' : 'text-slate-300'
                    }`}
                  >
                    {formatValue(col.key, row[col.key])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-700">
        <p className="text-xs text-slate-500">
          Showing {((page - 1) * pagination.pageSize) + 1}–{Math.min(page * pagination.pageSize, pagination.totalCount)} of {pagination.totalCount.toLocaleString()}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-xs text-slate-400">
            Page {page} of {pagination.totalPages}
          </span>
          <Button
            variant="ghost"
            size="sm"
            disabled={page >= pagination.totalPages}
            onClick={() => setPage(page + 1)}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
