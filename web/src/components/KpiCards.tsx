import React from 'react';
import { KpiData } from '../types';
import { Activity, Flame, BarChart2, Waves, CheckCircle2 } from 'lucide-react';

interface KpiCardsProps {
  kpis: KpiData | null;
  loading: boolean;
}

export const KpiCards: React.FC<KpiCardsProps> = ({ kpis, loading }) => {
  if (loading && !kpis) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-20 bg-[#171211] rounded-xl border border-[#241c19] animate-pulse p-4" />
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
      color: 'text-[#d5c4fb]',
      bg: 'bg-[#241a2e]',
      border: 'border-[#362744]',
      description: 'Ingesta continua',
      delta: 'Certificado',
    },
    {
      title: 'Magnitud Máxima',
      value: maxMag !== null && maxMag !== undefined ? maxMag.toFixed(1) : '—',
      unit: maxMag !== null ? 'Mw' : '',
      icon: Flame,
      color: 'text-[#fca5a5]',
      bg: 'bg-[#261418]',
      border: 'border-[#421d25]',
      description: 'Pico de energía',
      delta: 'Máx Registrado',
    },
    {
      title: 'Magnitud Promedio',
      value: avgMag !== null && avgMag !== undefined ? avgMag.toFixed(2) : '—',
      unit: avgMag !== null ? 'Mw' : '',
      icon: BarChart2,
      color: 'text-[#fcd34d]',
      bg: 'bg-[#262016]',
      border: 'border-[#44351a]',
      description: 'Media geométrica',
      delta: 'Línea Base',
    },
    {
      title: 'Alertas Tsunami',
      value: tsunamis,
      unit: 'alertas',
      icon: Waves,
      color: tsunamis > 0 ? 'text-[#f87171] animate-pulse' : 'text-[#86efac]',
      bg: tsunamis > 0 ? 'bg-[#291418]' : 'bg-[#14231b]',
      border: tsunamis > 0 ? 'border-[#521b25]' : 'border-[#204030]',
      description: 'Monitoreo costero',
      delta: tsunamis > 0 ? 'Alerta' : 'Normal',
    },
    {
      title: 'Conformidad Pandera',
      value: `${quality}%`,
      unit: 'score',
      icon: CheckCircle2,
      color: 'text-[#86efac]',
      bg: 'bg-[#14231b]',
      border: 'border-[#204030]',
      description: 'Quality Gate',
      delta: '100% Auditado',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className="p-3.5 bg-[#171211] rounded-xl border border-[#241c19] hover:border-[#3d312c] transition-all duration-200 shadow-sm relative overflow-hidden flex flex-col justify-between h-full min-h-[96px]"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-mono font-medium text-[#9b9baa] uppercase tracking-wider">
                {card.title}
              </span>
              <div className={`p-1.5 rounded-lg ${card.bg} ${card.color}`}>
                <Icon className="w-3.5 h-3.5" />
              </div>
            </div>

            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-mono font-bold text-[#f7f7f9] tracking-tight">
                {card.value}
              </span>
              {card.unit && (
                <span className="text-[11px] font-mono text-[#9b9baa]">{card.unit}</span>
              )}
            </div>

            <div className="flex items-center justify-between text-[10px] font-mono text-[#737384] mt-2 pt-1.5 border-t border-[#201917]">
              <span className="truncate">{card.description}</span>
              <span className="text-[#9b9baa] font-medium hidden sm:inline">{card.delta}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
