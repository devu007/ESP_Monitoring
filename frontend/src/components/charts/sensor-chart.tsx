'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, Brush,
} from 'recharts';
import { Maximize2, X } from 'lucide-react';

interface SensorChartProps {
  data: Record<string, any>[];
  lines: { key: string; color: string; label: string }[];
  title: string;
  yLabel?: string;
}

const formatDate = (ts: string) => {
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()}`;
};

const formatTooltipDate = (ts: unknown) => new Date(String(ts)).toLocaleString();

function ChartContent({
  data, lines, yLabel, height, expanded,
}: {
  data: Record<string, any>[];
  lines: SensorChartProps['lines'];
  yLabel?: string;
  height: number | `${number}%`;
  expanded?: boolean;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: expanded ? 30 : 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
        <XAxis
          dataKey="timestamp"
          tickFormatter={formatDate}
          stroke="#64748b"
          tick={{ fontSize: expanded ? 12 : 11 }}
          interval="preserveStartEnd"
        />
        <YAxis
          stroke="#64748b"
          tick={{ fontSize: expanded ? 12 : 11 }}
          label={yLabel ? { value: yLabel, angle: -90, position: 'insideLeft', style: { fill: '#64748b', fontSize: expanded ? 13 : 11 } } : undefined}
        />
        <Tooltip
          contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: expanded ? 13 : 12 }}
          labelFormatter={formatTooltipDate}
          labelStyle={{ color: '#94a3b8' }}
        />
        <Legend wrapperStyle={{ fontSize: expanded ? 13 : 11 }} />
        {lines.map((line) => (
          <Line
            key={line.key}
            type="monotone"
            dataKey={line.key}
            name={line.label}
            stroke={line.color}
            dot={false}
            strokeWidth={expanded ? 2 : 1.5}
            connectNulls
          />
        ))}
        {expanded && data.length > 50 && (
          <Brush
            dataKey="timestamp"
            height={24}
            stroke="#475569"
            fill="#1e293b"
            tickFormatter={formatDate}
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  );
}

export function SensorChart({ data, lines, title, yLabel }: SensorChartProps) {
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
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
        <h3 className="text-sm font-medium text-slate-300 mb-2">{title}</h3>
        <p className="text-xs text-slate-500">No data available</p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-slate-300">{title}</h3>
          <button
            onClick={() => setExpanded(true)}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-slate-700 transition-colors"
            title="Expand chart"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
        <ChartContent data={data} lines={lines} yLabel={yLabel} height={250} />
      </div>

      {expanded && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setExpanded(false); }}
        >
          <div className="relative w-[95vw] h-[85vh] bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">{title}</h2>
              <button
                onClick={() => setExpanded(false)}
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                title="Close (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="h-[calc(100%-3.5rem)]">
              <ChartContent data={data} lines={lines} yLabel={yLabel} height="100%" expanded />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
