'use client';

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';

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

export function HealthTrendChart({ data }: HealthTrendChartProps) {
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
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
      <h3 className="text-sm font-medium text-slate-300 mb-3">Health Score Trend</h3>
      <ResponsiveContainer width="100%" height={250}>
        <AreaChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <defs>
            <linearGradient id="healthGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={gradientColor} stopOpacity={0.3} />
              <stop offset="95%" stopColor={gradientColor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis
            dataKey="analyzedAt"
            tickFormatter={formatDate}
            stroke="#64748b"
            tick={{ fontSize: 11 }}
          />
          <YAxis domain={[0, 100]} stroke="#64748b" tick={{ fontSize: 11 }} />
          <Tooltip
            contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: 12 }}
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
            fill="url(#healthGrad)"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
      <div className="flex justify-center gap-6 mt-2 text-[10px] text-slate-500">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" /> Healthy (90+)</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" /> Normal (70-89)</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500" /> Degrading (40-69)</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> Critical (&lt;40)</span>
      </div>
    </div>
  );
}
