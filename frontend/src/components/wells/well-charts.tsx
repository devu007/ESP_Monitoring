'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { SensorChart } from '@/components/charts/sensor-chart';
import { HealthTrendChart } from '@/components/charts/health-trend-chart';

interface Props {
  wellId: string;
  uploadId: string;
}

const CHART_CONFIGS = [
  {
    title: 'Production Rates',
    yLabel: 'bpd',
    lines: [
      { key: 'liquidRate', color: '#3b82f6', label: 'Liquid Rate' },
      { key: 'oilRate', color: '#22c55e', label: 'Oil Rate' },
    ],
  },
  {
    title: 'Pressures',
    yLabel: 'psi',
    lines: [
      { key: 'intakePressure', color: '#06b6d4', label: 'Intake Pressure' },
      { key: 'dischargePressure', color: '#f97316', label: 'Discharge Pressure' },
    ],
  },
  {
    title: 'Motor Current & Temperature',
    lines: [
      { key: 'motorCurrent', color: '#eab308', label: 'Current (A)' },
      { key: 'motorTemperature', color: '#ef4444', label: 'Temperature (°F)' },
    ],
  },
  {
    title: 'Vibration & Power Factor',
    lines: [
      { key: 'vibration', color: '#a855f7', label: 'Vibration (g)' },
      { key: 'powerFactor', color: '#14b8a6', label: 'Power Factor' },
    ],
  },
];

export function WellCharts({ wellId, uploadId }: Props) {
  const [chartData, setChartData] = useState<any[]>([]);
  const [healthHistory, setHealthHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get<any[]>(`/wells/${wellId}/chart-data?uploadId=${uploadId}`),
      api.get<any[]>(`/wells/${wellId}/health-history`),
    ])
      .then(([chartRes, healthRes]) => {
        // Downsample if too many points for chart rendering
        const raw = chartRes.data ?? [];
        setChartData(raw.length > 500 ? downsample(raw, 500) : raw);
        setHealthHistory(healthRes.data ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [wellId, uploadId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <HealthTrendChart data={healthHistory} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {CHART_CONFIGS.map((cfg) => (
          <SensorChart
            key={cfg.title}
            data={chartData}
            lines={cfg.lines}
            title={cfg.title}
            yLabel={cfg.yLabel}
          />
        ))}
      </div>
    </div>
  );
}

function downsample(data: any[], target: number): any[] {
  const step = Math.ceil(data.length / target);
  return data.filter((_, i) => i % step === 0);
}
