'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Brush,
} from 'recharts';
import { Maximize2, X } from 'lucide-react';

interface HealthTrendChartProps {
  data: { analyzedAt: string; healthScore: number; riskLevel: string }[];
}

const formatDate = (ts: string) => {
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const getColor = (score: number) => {
  if (score >= 90) return '#22c55e';
  if (score >= 70) return '#3b82f6';
  if (score >= 40) return '#eab308';
  return '#ef4444';
};

function HealthChartContent({
  data, gradientColor, height, expanded,
}: {
  data: HealthTrendChartProps['data'];
  gradientColor: string;
  height: number | `${number}%`;
  expanded?: boolean;
}) {
  const gradId = expanded ? 'healthGradExpanded' : 'healthGrad';
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: expanded ? 30 : 5 }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={gradientColor} stopOpacity={0.3} />
            <stop offset="95%" stopColor={gradientColor} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
        <XAxis
          dataKey="analyzedAt"
          tickFormatter={formatDate}
          stroke="#64748b"
          tick={{ fontSize: expanded ? 12 : 11 }}
        />
        <YAxis domain={[0, 100]} stroke="#64748b" tick={{ fontSize: expanded ? 12 : 11 }} />
        <Tooltip
          contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: expanded ? 13 : 12 }}
          labelFormatter={(label) => `Analyzed: ${new Date(String(label)).toLocaleString()}`}
          labelStyle={{ color: '#94a3b8' }}
          formatter={(value) => [`${Number(value).toFixed(1)}`, 'Health Score']}
        />
        <ReferenceLine y={90} stroke="#22c55e" strokeDasharray="3 3" strokeOpacity={0.5} />
        <ReferenceLine y={70} stroke="#3b82f6" strokeDasharray="3 3" strokeOpacity={0.5} />
        <ReferenceLine y={40} stroke="#eab308" strokeDasharray="3 3" strokeOpacity={0.5} />
        <Area
          type="monotone"
          dataKey="healthScore"
          stroke={gradientColor}
          fill={`url(#${gradId})`}
          strokeWidth={expanded ? 2.5 : 2}
        />
        {expanded && data.length > 10 && (
          <Brush
            dataKey="analyzedAt"
            height={24}
            stroke="#475569"
            fill="#1e293b"
            tickFormatter={formatDate}
          />
        )}
      </AreaChart>
    </ResponsiveContainer>
  );
}

const LEGEND_ITEMS = [
  { color: 'bg-green-500', label: 'Healthy (90+)' },
  { color: 'bg-blue-500', label: 'Normal (70-89)' },
  { color: 'bg-yellow-500', label: 'Degrading (40-69)' },
  { color: 'bg-red-500', label: 'Critical (<40)' },
];

export function HealthTrendChart({ data }: HealthTrendChartProps) {
  const [expanded, setExpanded] = useState(false);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') setExpanded(false);
  }, []);

  useEffect(() => {
    if (expanded) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [expanded, handleKeyDown]);

  if (!data || data.length === 0) {
    return (
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 text-center">
        <p className="text-sm text-slate-500">No health history available. Run analysis multiple times to see trends.</p>
      </div>
    );
  }

  const latestScore = data[data.length - 1]?.healthScore ?? 0;
  const gradientColor = getColor(latestScore);

  return (
    <>
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-slate-300">Health Score Trend</h3>
          <button
            onClick={() => setExpanded(true)}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-slate-700 transition-colors"
            title="Expand chart"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
        <HealthChartContent data={data} gradientColor={gradientColor} height={250} />
        <div className="flex justify-center gap-6 mt-2 text-[10px] text-slate-500">
          {LEGEND_ITEMS.map((item) => (
            <span key={item.label} className="flex items-center gap-1">
              <span className={`w-2 h-2 rounded-full ${item.color}`} /> {item.label}
            </span>
          ))}
        </div>
      </div>

      {expanded && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setExpanded(false); }}
        >
          <div className="relative w-[95vw] h-[85vh] bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Health Score Trend</h2>
              <button
                onClick={() => setExpanded(false)}
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                title="Close (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="h-[calc(100%-5rem)]">
              <HealthChartContent data={data} gradientColor={gradientColor} height="100%" expanded />
            </div>
            <div className="flex justify-center gap-6 mt-2 text-xs text-slate-500">
              {LEGEND_ITEMS.map((item) => (
                <span key={item.label} className="flex items-center gap-1">
                  <span className={`w-2 h-2 rounded-full ${item.color}`} /> {item.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
