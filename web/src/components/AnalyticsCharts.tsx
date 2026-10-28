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
      <div className="bg-[#171211]/95 backdrop-blur-md border border-[#332b27] p-2.5 rounded-xl shadow-2xl text-xs font-mono">
        <p className="font-semibold text-[#f7f7f9] mb-1.5">{label}</p>
        {payload.map((entry: any, index: number) => {
          const color = entry.color || entry.payload?.fill || '#d5c4fb';
          return (
            <p key={index} style={{ color }} className="font-medium flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
              <span>{entry.name}: {entry.value}</span>
            </p>
          );
        })}
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
          <div key={i} className="h-64 bg-[#171211] rounded-2xl border border-[#261f1c] animate-pulse" />
        ))}
      </div>
    );
  }

  const timelineData = stats?.timeline || [];
  const magnitudeData = stats?.magnitude_distribution || [];
  const regionsData = stats?.top_regions || [];

  const magColors: Record<string, string> = {
    '< 3.0': '#86efac',
    '3.0 - 4.5': '#fde047',
    '4.5 - 6.0': '#fb923c',
    '>= 6.0': '#f87171',
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* 1. Timeline Chart */}
      <div className="bg-[#171211] border border-[#261f1c] rounded-2xl p-4 shadow-sm hover:border-[#332b27] transition-all duration-200">
        <div className="flex items-center gap-2 mb-3">
          <div className="p-1.5 bg-[#241a2e] text-[#d5c4fb] rounded-xl border border-[#4a365f]/40">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-mono font-semibold text-[#f7f7f9] uppercase tracking-wider">
              Frecuencia Temporal
            </h3>
            <p className="text-[10px] text-[#9b9baa] font-mono">Eventos por intervalo horario</p>
          </div>
        </div>
        <div className="h-56 w-full">
          {timelineData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs font-mono text-[#9b9baa]">
              Sin datos temporales en este rango
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timelineData}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#d5c4fb" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#844dea" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#261f1c" />
                <XAxis
                  dataKey="time_bucket"
                  stroke="#9b9baa"
                  fontSize={10}
                  tickFormatter={(val) => val.slice(-5)}
                />
                <YAxis stroke="#9b9baa" fontSize={10} allowDecimals={false} />
                <Tooltip
                  content={<CustomTooltip />}
                  cursor={{ stroke: '#844dea', strokeWidth: 1.5, strokeDasharray: '3 3' }}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  name="Eventos"
                  stroke="#d5c4fb"
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
      <div className="bg-[#171211] border border-[#261f1c] rounded-2xl p-4 shadow-sm hover:border-[#332b27] transition-all duration-200">
        <div className="flex items-center gap-2 mb-3">
          <div className="p-1.5 bg-[#261f18] text-[#fcd34d] rounded-xl border border-[#4a3a28]/40">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-mono font-semibold text-[#f7f7f9] uppercase tracking-wider">
              Distribución de Magnitud
            </h3>
            <p className="text-[10px] text-[#9b9baa] font-mono">Conteo por severidad energética</p>
          </div>
        </div>
        <div className="h-56 w-full">
          {magnitudeData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs font-mono text-[#9b9baa]">
              Sin datos de magnitud en este rango
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={magnitudeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#261f1c" />
                <XAxis dataKey="bucket" stroke="#9b9baa" fontSize={10} />
                <YAxis stroke="#9b9baa" fontSize={10} allowDecimals={false} />
                <Tooltip
                  content={<CustomTooltip />}
                  cursor={{ fill: 'rgba(255, 255, 255, 0.05)', radius: 6 }}
                />
                <Bar dataKey="count" name="Sismos" radius={[6, 6, 0, 0]}>
                  {magnitudeData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={magColors[entry.bucket] || '#d5c4fb'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* 3. Top Active Regions */}
      <div className="bg-[#171211] border border-[#261f1c] rounded-2xl p-4 shadow-sm hover:border-[#332b27] transition-all duration-200">
        <div className="flex items-center gap-2 mb-3">
          <div className="p-1.5 bg-[#241a2e] text-[#d5c4fb] rounded-xl border border-[#4a365f]/40">
            <MapPin className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-mono font-semibold text-[#f7f7f9] uppercase tracking-wider">
              Top Regiones Activas
            </h3>
            <p className="text-[10px] text-[#9b9baa] font-mono">Zonas geográficas de mayor recurrencia</p>
          </div>
        </div>
        <div className="h-56 w-full overflow-y-auto space-y-2 pr-1">
          {regionsData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs font-mono text-[#9b9baa]">
              Sin datos de regiones
            </div>
          ) : (
            regionsData.map((reg, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2 rounded-xl bg-[#120e0d] border border-[#241c19] text-xs font-mono"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-4 h-4 rounded-full bg-[#201a18] text-[10px] flex items-center justify-center text-[#9b9baa] flex-shrink-0">
                    {idx + 1}
                  </span>
                  <span className="text-[#ececf1] truncate">{reg.region}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-[#9b9baa] text-[10px]">Mw ~{reg.avg_magnitude.toFixed(1)}</span>
                  <span className="px-2 py-0.5 rounded-md bg-[#241a2e] text-[#d5c4fb] font-semibold text-[10px] border border-[#4a365f]/50">
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
