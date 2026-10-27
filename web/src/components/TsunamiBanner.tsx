import React from 'react';
import { Waves } from 'lucide-react';
import { EarthquakeEvent } from '../types';

interface TsunamiBannerProps {
  alertsCount: number;
  events?: EarthquakeEvent[];
}

export const TsunamiBanner: React.FC<TsunamiBannerProps> = ({ alertsCount, events = [] }) => {
  const criticalEvent = events.find((e) => e.tsunami === 1 || e.mag >= 6.5);

  if (alertsCount === 0 && !criticalEvent) {
    return null;
  }

  return (
    <div className="rounded-xl bg-[#291418] border border-[#521b25] p-3.5 shadow-sm text-xs">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-[#521b25] text-[#fca5a5] shrink-0">
            <Waves className="w-4 h-4 animate-bounce" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-1.5 py-0.5 rounded bg-[#521b25] text-[#fca5a5] font-mono text-[10px] font-bold tracking-wider uppercase">
                ALERTA DE TSUNAMI ACTIVA
              </span>
              <span className="text-[11px] font-mono text-[#fca5a5]/80">
                ({alertsCount > 0 ? alertsCount : 1} {alertsCount === 1 ? 'evento crítico' : 'eventos críticos'})
              </span>
            </div>
            <p className="text-xs text-[#ececf1] mt-0.5">
              {criticalEvent ? (
                <>
                  Sismo M <strong className="text-white font-bold">{criticalEvent.mag.toFixed(1)}</strong> en{' '}
                  <strong className="text-white">{criticalEvent.place}</strong> — Profundidad:{' '}
                  {criticalEvent.depth_km?.toFixed(1) || '—'} km. Matriz de Riesgo Costero.
                </>
              ) : (
                'Protocolo de emergencia NOAA / PTWC en curso para zonas costeras.'
              )}
            </p>
          </div>
        </div>

        <div className="text-right font-mono text-[10px] text-[#fca5a5]/80 shrink-0 hidden sm:block">
          <div>CONDICIÓN MATRIZ:</div>
          <div className="font-semibold text-white">M &ge; 6.8 &bull; Flag Tsunami = 1</div>
        </div>
      </div>
    </div>
  );
};
