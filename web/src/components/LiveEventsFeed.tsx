import React from 'react';
import { EarthquakeEvent } from '../types';
import { Waves, MapPin, ChevronRight, AlertTriangle, ShieldCheck } from 'lucide-react';
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
    <div className="w-full h-[540px] rounded-2xl overflow-hidden border border-slate-800 bg-[#060911] shadow-2xl flex flex-col">
      {/* Feed Header */}
      <div className="p-3.5 bg-[#0a0f1d] border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              connectionStatus === 'connected'
                ? 'bg-emerald-400 animate-pulse'
                : connectionStatus === 'reconnecting'
                ? 'bg-amber-400 animate-ping'
                : 'bg-rose-500'
            }`}
          />
          <h3 className="text-xs font-bold text-white tracking-wide uppercase font-mono">
            Telemetría Sísmica Reciente
          </h3>
        </div>

        <div className="text-[11px] font-mono text-slate-400">
          {events.length} sismos curados
        </div>
      </div>

      {/* Events Scrollable List */}
      <div className="flex-grow overflow-y-auto divide-y divide-slate-800/80">
        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center text-slate-500">
            <p className="text-xs font-mono">Esperando eventos sísmicos...</p>
          </div>
        ) : (
          events.map((evt) => {
            const isSelected = selectedEventId === evt.id;
            const magColor = getMagnitudeColor(evt.mag);
            const isHighMag = evt.mag >= 6.0;

            return (
              <div
                key={evt.id}
                onClick={() => onSelectEvent(evt)}
                className={`p-3.5 transition-all cursor-pointer flex items-center justify-between gap-3 ${
                  isSelected
                    ? 'bg-blue-950/40 border-l-4 border-blue-500'
                    : 'hover:bg-slate-900/60'
                }`}
              >
                {/* Magnitude Badge */}
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-11 h-11 rounded-xl flex flex-col items-center justify-center font-mono font-black shrink-0 shadow-md text-white border"
                    style={{
                      backgroundColor: `${magColor}20`,
                      borderColor: `${magColor}50`,
                      color: magColor,
                    }}
                  >
                    <span className="text-xs leading-none">{evt.mag.toFixed(1)}</span>
                    <span className="text-[8px] uppercase tracking-wider opacity-80 mt-0.5">Mw</span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-semibold text-slate-200 truncate">
                        {evt.place || 'Epicentro no especificado'}
                      </h4>
                      {evt.tsunami === 1 && (
                        <span
                          title="Alerta de Tsunami Emitida"
                          className="px-1.5 py-0.5 rounded text-[8px] font-mono font-black uppercase bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center gap-0.5 shrink-0"
                        >
                          <Waves className="w-2.5 h-2.5" />
                          TSUNAMI
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-1 text-[10px] font-mono text-slate-400">
                      <span>Prof: {evt.depth_km != null ? `${evt.depth_km.toFixed(1)} km` : '—'}</span>
                      <span>&bull;</span>
                      <span>{new Date(evt.time).toLocaleTimeString()} UTC</span>
                    </div>
                  </div>
                </div>

                <ChevronRight className="w-4 h-4 text-slate-600 shrink-0" />
              </div>
            );
          })
        )}
      </div>

      {/* Feed Footer */}
      <div className="p-2 bg-[#0a0f1d] border-t border-slate-800 text-center text-[10px] font-mono text-slate-400">
        Invariante Medallion: 100% de eventos validados por Pandera
      </div>
    </div>
  );
};
