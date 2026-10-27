import React from 'react';
import { KpiData } from '../types';
import { Activity, Flame, BarChart2, Waves, CheckCircle2, Clock } from 'lucide-react';

interface KpiCardsProps {
  kpis: KpiData | null;
  loading: boolean;
}

export const KpiCards: React.FC<KpiCardsProps> = ({ kpis, loading }) => {
  if (loading && !kpis) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-24 bg-slate-900/60 rounded-xl border border-slate-800 animate-pulse p-4" />
        ))}
      </div>
    );
  }

  const cards = [
    {
      title: 'Sismos Últimas 24h',
      value: kpis?.total_events_24h ?? 0,
      icon: Activity,
      color: 'text-indigo-400',
      bg: 'bg-indigo-500/10',
      border: 'border-indigo-500/20',
      description: 'Eventos sísmicos curados',
    },
    {
      title: 'Magnitud Máxima',
      value: kpis?.max_magnitude_24h !== null && kpis?.max_magnitude_24h !== undefined ? `${kpis.max_magnitude_24h} Mw` : '—',
      icon: Flame,
      color: 'text-rose-400',
      bg: 'bg-rose-500/10',
      border: 'border-rose-500/20',
      description: 'Pico de energía detectado',
    },
    {
      title: 'Magnitud Promedio',
      value: kpis?.avg_magnitude_24h !== null && kpis?.avg_magnitude_24h !== undefined ? `${kpis.avg_magnitude_24h} Mw` : '—',
      icon: BarChart2,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
      description: 'Media geométrica 24h',
    },
    {
      title: 'Alertas de Tsunami',
      value: kpis?.tsunami_alerts_24h ?? 0,
      icon: Waves,
      color: (kpis?.tsunami_alerts_24h ?? 0) > 0 ? 'text-rose-400 animate-bounce' : 'text-cyan-400',
      bg: 'bg-cyan-500/10',
      border: 'border-cyan-500/20',
      description: 'Protocolos costeros activos',
    },
    {
      title: 'Índice Calidad Pandera',
      value: `${kpis?.data_quality_score ?? 100}%`,
      icon: CheckCircle2,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
      description: 'Conformidad de esquemas',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className={`p-4 bg-slate-900/80 backdrop-blur-sm rounded-xl border ${card.border} transition-transform hover:-translate-y-0.5 shadow-sm`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                {card.title}
              </span>
              <div className={`p-1.5 rounded-lg ${card.bg} ${card.color}`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black text-white tracking-tight">{card.value}</div>
            <p className="text-[10px] text-slate-400 mt-1">{card.description}</p>
          </div>
        );
      })}
    </div>
  );
};

