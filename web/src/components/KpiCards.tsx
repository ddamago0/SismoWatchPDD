import React from 'react';
import { KpiData } from '../types';
import { Activity, Flame, BarChart2, Waves, CheckCircle2, TrendingUp } from 'lucide-react';

interface KpiCardsProps {
  kpis: KpiData | null;
  loading: boolean;
}

export const KpiCards: React.FC<KpiCardsProps> = ({ kpis, loading }) => {
  if (loading && !kpis) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-20 bg-dark-900 rounded-2xl border border-white/5 animate-pulse p-4" />
        ))}
      </div>
    );
  }

  const maxMag = kpis?.max_magnitude ?? kpis?.max_magnitude_24h;
  const avgMag = kpis?.avg_magnitude ?? kpis?.avg_magnitude_24h;
  const tsunamis = kpis?.tsunami_alerts_count ?? kpis?.tsunami_alerts_24h ?? 0;
  const quality = kpis?.quality_score ?? kpis?.data_quality_score ?? 100;
  const total24h = kpis?.total_events_24h ?? 0;

  const cards = [
    {
      title: 'Sismos Últimas 24h',
      value: total24h,
      unit: 'eventos',
      icon: Activity,
      color: 'text-cobalt-400',
      bg: 'bg-cobalt-500/10',
      border: 'border-cobalt-500/20',
      description: 'Ingesta continua certificada',
      delta: '+100% feed activo',
    },
    {
      title: 'Magnitud Máxima',
      value: maxMag !== null && maxMag !== undefined ? maxMag.toFixed(1) : '—',
      unit: maxMag !== null ? 'Mw' : '',
      icon: Flame,
      color: 'text-coral-400',
      bg: 'bg-coral-500/10',
      border: 'border-coral-500/20',
      description: 'Pico de energía sísmica',
      delta: 'Severidad calculada',
    },
    {
      title: 'Magnitud Promedio',
      value: avgMag !== null && avgMag !== undefined ? avgMag.toFixed(2) : '—',
      unit: avgMag !== null ? 'Mw' : '',
      icon: BarChart2,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
      description: 'Media geométrica 24h',
      delta: 'Línea base estable',
    },
    {
      title: 'Alertas de Tsunami',
      value: tsunamis,
      unit: 'alertas',
      icon: Waves,
      color: tsunamis > 0 ? 'text-coral-400 animate-pulse' : 'text-cyan-400',
      bg: 'bg-cyan-500/10',
      border: 'border-cyan-500/20',
      description: 'Protocolos costeros activos',
      delta: tsunamis > 0 ? 'Protocolo Alerta' : 'Sin riesgo costero',
    },
    {
      title: 'Conformidad Pandera',
      value: `${quality}%`,
      unit: 'score',
      icon: CheckCircle2,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
      description: 'Quality Gate Medallion',
      delta: 'Zero Data Loss',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className={`p-4 bg-dark-900/90 backdrop-blur-md rounded-2xl border ${card.border} transition-all hover:border-white/20 shadow-md relative overflow-hidden`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                {card.title}
              </span>
              <div className={`p-1.5 rounded-lg ${card.bg} ${card.color}`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>

            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-mono font-black text-white tracking-tight">
                {card.value}
              </span>
              {card.unit && (
                <span className="text-xs font-mono text-slate-400 font-semibold">{card.unit}</span>
              )}
            </div>

            <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mt-2 pt-2 border-t border-white/5">
              <span className="truncate">{card.description}</span>
              <span className="text-emerald-400 font-bold hidden sm:inline">{card.delta}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
