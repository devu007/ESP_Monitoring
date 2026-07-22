'use client';

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';

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

export function SensorChart({ data, lines, title, yLabel }: SensorChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
        <h3 className="text-sm font-medium text-slate-300 mb-2">{title}</h3>
        <p className="text-xs text-slate-500">No data available</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
      <h3 className="text-sm font-medium text-slate-300 mb-3">{title}</h3>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis
            dataKey="timestamp"
            tickFormatter={formatDate}
            stroke="#64748b"
            tick={{ fontSize: 11 }}
            interval="preserveStartEnd"
          />
          <YAxis
            stroke="#64748b"
            tick={{ fontSize: 11 }}
            label={yLabel ? { value: yLabel, angle: -90, position: 'insideLeft', style: { fill: '#64748b', fontSize: 11 } } : undefined}
          />
          <Tooltip
            contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: 12 }}
            labelFormatter={formatTooltipDate}
            labelStyle={{ color: '#94a3b8' }}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {lines.map((line) => (
            <Line
              key={line.key}
              type="monotone"
              dataKey={line.key}
              name={line.label}
              stroke={line.color}
              dot={false}
              strokeWidth={1.5}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
