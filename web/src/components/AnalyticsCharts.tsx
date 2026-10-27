import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from 'recharts';
import { StatsResponse } from '../types';
import { BarChart3, TrendingUp, MapPin } from 'lucide-react';

interface AnalyticsChartsProps {
  stats: StatsResponse | null;
  loading: boolean;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-dark-950 border border-white/10 p-2.5 rounded-xl shadow-2xl text-xs font-mono">
        <p className="font-bold text-white mb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} style={{ color: entry.color }} className="font-medium">
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export const AnalyticsCharts: React.FC<AnalyticsChartsProps> = ({ stats, loading }) => {
  if (loading && !stats) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-64 bg-dark-900 rounded-2xl border border-white/5 animate-pulse" />
        ))}
      </div>
    );
  }

  const timelineData = stats?.timeline || [];
  const magnitudeData = stats?.magnitude_distribution || [];
  const regionsData = stats?.top_regions || [];

  const magColors: Record<string, string> = {
    '< 3.0': '#10b981',
    '3.0 - 4.5': '#f59e0b',
    '4.5 - 6.0': '#f97316',
    '>= 6.0': '#ef4444',
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* 1. Timeline Chart */}
      <div className="bg-dark-900/90 backdrop-blur-md border border-white/10 rounded-2xl p-4 shadow-xl">
        <div className="flex items-center gap-2 mb-3">
          <div className="p-1.5 bg-cobalt-500/10 text-cobalt-400 rounded-xl border border-cobalt-500/20">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
              Frecuencia Temporal
            </h3>
            <p className="text-[10px] text-slate-400 font-mono">Eventos por intervalo horario</p>
          </div>
        </div>
        <div className="h-56 w-full">
          {timelineData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs font-mono text-slate-500">
              Sin datos temporales en este rango
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timelineData}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0052ff" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#0052ff" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis
                  dataKey="time_bucket"
                  stroke="#64748b"
                  fontSize={10}
                  tickFormatter={(val) => val.slice(-5)}
                />
                <YAxis stroke="#64748b" fontSize={10} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="count"
                  name="Eventos"
                  stroke="#0052ff"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorCount)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* 2. Magnitude Distribution */}
      <div className="bg-dark-900/90 backdrop-blur-md border border-white/10 rounded-2xl p-4 shadow-xl">
        <div className="flex items-center gap-2 mb-3">
          <div className="p-1.5 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
              Distribución de Magnitud
            </h3>
            <p className="text-[10px] text-slate-400 font-mono">Conteo por severidad energética</p>
          </div>
        </div>
        <div className="h-56 w-full">
          {magnitudeData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs font-mono text-slate-500">
              Sin datos de magnitud en este rango
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={magnitudeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="bucket" stroke="#64748b" fontSize={10} />
                <YAxis stroke="#64748b" fontSize={10} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" name="Sismos" radius={[6, 6, 0, 0]}>
                  {magnitudeData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={magColors[entry.bucket] || '#0052ff'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* 3. Top Active Regions */}
      <div className="bg-dark-900/90 backdrop-blur-md border border-white/10 rounded-2xl p-4 shadow-xl">
        <div className="flex items-center gap-2 mb-3">
          <div className="p-1.5 bg-coral-500/10 text-coral-400 rounded-xl border border-coral-500/20">
            <MapPin className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
              Top Regiones Activas
            </h3>
            <p className="text-[10px] text-slate-400 font-mono">Zonas geográficas de mayor recurrencia</p>
          </div>
        </div>
        <div className="h-56 w-full overflow-y-auto space-y-2 pr-1">
          {regionsData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs font-mono text-slate-500">
              Sin datos de regiones
            </div>
          ) : (
            regionsData.map((reg, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2 rounded-xl bg-dark-950 border border-white/5 text-xs font-mono"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-4 h-4 rounded-full bg-white/5 text-[10px] flex items-center justify-center text-slate-400 flex-shrink-0">
                    {idx + 1}
                  </span>
                  <span className="text-slate-200 truncate">{reg.region}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-slate-400 text-[10px]">Mw ~{reg.avg_magnitude.toFixed(1)}</span>
                  <span className="px-2 py-0.5 rounded-md bg-cobalt-500/15 text-cobalt-400 font-bold text-[10px] border border-cobalt-500/30">
                    {reg.count}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
