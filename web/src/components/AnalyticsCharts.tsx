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
      <div className="bg-slate-900 border border-slate-700 p-2.5 rounded-lg shadow-xl text-xs">
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
          <div key={i} className="h-64 bg-slate-900/50 rounded-xl border border-slate-800 animate-pulse" />
        ))}
      </div>
    );
  }

  const timelineData = stats?.timeline || [];
  const magnitudeData = stats?.magnitude_distribution || [];
  const regionsData = stats?.top_regions || [];

  const magColors: Record<string, string> = {
    '< 3.0': '#10b981',
    '3.0 - 4.5': '#eab308',
    '4.5 - 6.0': '#f97316',
    '>= 6.0': '#ef4444',
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* 1. Timeline Chart */}
      <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <div className="p-1.5 bg-indigo-500/10 text-indigo-400 rounded-lg">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Frecuencia Temporal
            </h3>
            <p className="text-[10px] text-slate-400">Sismos acumulados por intervalo de tiempo</p>
          </div>
        </div>
        <div className="h-56 w-full">
          {timelineData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-slate-500">
              Sin datos temporales en este rango
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timelineData}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
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
                  stroke="#6366f1"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorCount)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* 2. Magnitude Distribution Histogram */}
      <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <div className="p-1.5 bg-amber-500/10 text-amber-400 rounded-lg">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Distribución de Magnitud
            </h3>
            <p className="text-[10px] text-slate-400">Conteo por severidad energética</p>
          </div>
        </div>
        <div className="h-56 w-full">
          {magnitudeData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-slate-500">
              Sin datos de magnitud
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={magnitudeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="bucket" stroke="#64748b" fontSize={10} />
                <YAxis stroke="#64748b" fontSize={10} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" name="Sismos" radius={[4, 4, 0, 0]}>
                  {magnitudeData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={magColors[entry.bucket] || '#6366f1'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* 3. Top Active Regions */}
      <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <div className="p-1.5 bg-rose-500/10 text-rose-400 rounded-lg">
            <MapPin className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Top Regiones Activas
            </h3>
            <p className="text-[10px] text-slate-400">Zonas geográficas de mayor recurrencia</p>
          </div>
        </div>
        <div className="h-56 w-full">
          {regionsData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-slate-500">
              Sin datos regionales
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={regionsData.slice(0, 5)}
                layout="vertical"
                margin={{ left: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis type="number" stroke="#64748b" fontSize={10} allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="region"
                  stroke="#64748b"
                  fontSize={9}
                  width={90}
                  tickFormatter={(val) => (val.length > 14 ? `${val.slice(0, 14)}...` : val)}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" name="Eventos" fill="#818cf8" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
};

