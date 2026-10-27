import React from 'react';
import { Waves, AlertTriangle } from 'lucide-react';
import { EarthquakeEvent } from '../types';

interface TsunamiBannerProps {
  alertsCount: number;
  events?: EarthquakeEvent[];
}

export const TsunamiBanner: React.FC<TsunamiBannerProps> = ({ alertsCount, events = [] }) => {
  // Find if there's any active tsunami alert event or high magnitude event (M >= 6.5)
  const criticalEvent = events.find((e) => e.tsunami === 1 || e.mag >= 6.5);

  if (alertsCount === 0 && !criticalEvent) {
    return null;
  }

  return (
    <div className="rounded-2xl bg-gradient-to-r from-rose-950/90 via-red-900/70 to-rose-950/90 border border-rose-500/80 p-4 shadow-[0_0_30px_rgba(239,68,68,0.3)] animate-pulse">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-rose-600 text-white shadow-lg shrink-0">
            <Waves className="w-6 h-6 animate-bounce" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 rounded-md bg-rose-600 text-white font-mono text-xs font-black tracking-wider uppercase">
                ALERTA DE TSUNAMI ACTIVA
              </span>
              <span className="text-xs font-mono text-rose-200">
                ({alertsCount > 0 ? alertsCount : 1} {alertsCount === 1 ? 'evento crítico detectado' : 'eventos críticos detectados'})
              </span>
            </div>
            <p className="text-sm text-rose-100 font-medium mt-1">
              {criticalEvent ? (
                <>
                  Sismo M <strong className="text-white text-base font-bold">{criticalEvent.mag.toFixed(1)}</strong> en{' '}
                  <strong className="text-white">{criticalEvent.place}</strong> — Profundidad:{' '}
                  {criticalEvent.depth_km?.toFixed(1) || '—'} km. Matriz de Riesgo Costero Activada.
                </>
              ) : (
                'Protocolo de emergencia NOAA / PTWC en curso para zonas costeras en el radio de impacto.'
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end md:self-center shrink-0">
          <div className="text-right font-mono text-xs text-rose-300">
            <div>CONDICIÓN MATRIZ:</div>
            <div className="font-bold text-white">M &ge; 6.8 &bull; Flag Tsunami = 1</div>
          </div>
        </div>
      </div>
    </div>
  );
};
