import React from 'react';
import { EarthquakeEvent } from '../types';
import { Radio, Waves, MapPin, ChevronRight, AlertTriangle, ShieldCheck } from 'lucide-react';
import { SSEConnectionStatus } from '../services/sse';

interface LiveEventsFeedProps {
  events: EarthquakeEvent[];
  connectionStatus: SSEConnectionStatus;
  selectedEventId?: string;
  onSelectEvent: (event: EarthquakeEvent) => void;
}

function getMagnitudeColor(mag: number): string {
  if (mag < 3.0) return '#10b981';
  if (mag < 4.5) return '#f59e0b';
  if (mag < 6.0) return '#f97316';
  return '#ef4444';
}

export const LiveEventsFeed: React.FC<LiveEventsFeedProps> = ({
  events,
  connectionStatus,
  selectedEventId,
  onSelectEvent,
}) => {
  return (
    <div className="w-full h-[520px] rounded-2xl overflow-hidden border border-white/10 bg-dark-900 shadow-2xl flex flex-col">
      {/* Feed Header */}
      <div className="p-3.5 bg-dark-950/80 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-cobalt-500/10 text-cobalt-400 border border-cobalt-500/20">
            <Radio className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white tracking-tight uppercase font-mono">
              Feed de Eventos en Tiempo Real
            </h3>
            <p className="text-[10px] text-slate-400 font-mono">
              Ingesta continua USGS transmitida por SSE
            </p>
          </div>
        </div>

        {/* SSE Status Pill */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-dark-850 border border-white/10 text-[10px] font-mono">
          <span
            className={`w-2 h-2 rounded-full ${
              connectionStatus === 'connected'
                ? 'bg-emerald-400 animate-ping'
                : connectionStatus === 'reconnecting'
                ? 'bg-amber-400 animate-pulse'
                : 'bg-rose-500'
            }`}
          />
          <span
            className={
              connectionStatus === 'connected'
                ? 'text-emerald-400 font-semibold'
                : connectionStatus === 'reconnecting'
                ? 'text-amber-400 font-semibold'
                : 'text-rose-400 font-semibold'
            }
          >
            {connectionStatus === 'connected'
              ? 'SSE EN VIVO'
              : connectionStatus === 'reconnecting'
              ? 'RECONECTANDO...'
              : 'DESCONECTADO'}
          </span>
        </div>
      </div>

      {/* Events List Scrollable */}
      <div className="flex-grow overflow-y-auto divide-y divide-white/5 p-2 space-y-1.5">
        {events.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-500 font-mono text-xs">
            <Radio className="w-8 h-8 mb-2 opacity-30 text-slate-400" />
            <p>Esperando telemetría de eventos sísmicos...</p>
            <p className="text-[10px] text-slate-600 mt-1">Los nuevos sismos aparecerán automáticamente aquí.</p>
          </div>
        ) : (
          events.map((evt) => {
            const color = getMagnitudeColor(evt.mag);
            const isSelected = selectedEventId === evt.id;

            return (
              <div
                key={evt.id}
                onClick={() => onSelectEvent(evt)}
                className={`p-2.5 rounded-xl transition-all cursor-pointer border ${
                  isSelected
                    ? 'bg-cobalt-500/15 border-cobalt-500/50 shadow-md'
                    : 'bg-dark-850/50 hover:bg-dark-850 border-white/5 hover:border-white/10'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  {/* Magnitude Pill */}
                  <div
                    className="px-2 py-0.5 rounded text-white text-xs font-mono font-bold flex-shrink-0 shadow-sm"
                    style={{ backgroundColor: color }}
                  >
                    {evt.mag.toFixed(1)} Mw
                  </div>

                  {/* Title & Location */}
                  <div className="flex-grow min-w-0">
                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-0.5">
                      <span className="truncate max-w-[120px] text-slate-500">ID: {evt.id}</span>
                      <span>
                        {new Date(evt.time).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </span>
                    </div>

                    <h4 className="text-xs font-semibold text-slate-200 truncate leading-snug">
                      {evt.place}
                    </h4>

                    {/* Coordinates & Depth */}
                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mt-1">
                      <span>Prof: <strong className="text-slate-300">{evt.depth_km.toFixed(1)} km</strong></span>
                      <span className="truncate">
                        [{evt.latitude.toFixed(2)}, {evt.longitude.toFixed(2)}]
                      </span>
                    </div>

                    {/* Tsunami badge if alert */}
                    {evt.tsunami === 1 && (
                      <div className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[9px] font-mono font-bold">
                        <Waves className="w-3 h-3" />
                        <span>ALERTA TSUNAMI</span>
                      </div>
                    )}
                  </div>

                  <ChevronRight className={`w-4 h-4 flex-shrink-0 mt-1 ${isSelected ? 'text-cobalt-400' : 'text-slate-600'}`} />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Counter */}
      <div className="p-2.5 bg-dark-950 border-t border-white/10 flex items-center justify-between text-[10px] font-mono text-slate-500">
        <span>Mostrando {events.length} eventos recientes</span>
        <span className="flex items-center gap-1 text-emerald-400">
          <ShieldCheck className="w-3 h-3" />
          100% Curados
        </span>
      </div>
    </div>
  );
};
