import React from 'react';
import { EarthquakeEvent } from '../types';
import { Waves, ChevronRight } from 'lucide-react';
import { SSEConnectionStatus } from '../services/sse';

interface LiveEventsFeedProps {
  events: EarthquakeEvent[];
  connectionStatus: SSEConnectionStatus;
  selectedEventId?: string;
  onSelectEvent: (event: EarthquakeEvent) => void;
}

function getMagnitudeColor(mag: number): string {
  if (mag < 3.0) return '#86efac';
  if (mag < 4.5) return '#fcd34d';
  if (mag < 6.0) return '#fb923c';
  return '#f87171';
}

export const LiveEventsFeed: React.FC<LiveEventsFeedProps> = ({
  events,
  connectionStatus,
  selectedEventId,
  onSelectEvent,
}) => {
  return (
    <div className="w-full h-[540px] rounded-xl overflow-hidden border border-[#241c19] bg-[#120e0d] shadow-sm flex flex-col">
      {/* Feed Header */}
      <div className="p-3 bg-[#171211] border-b border-[#241c19] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${
              connectionStatus === 'connected'
                ? 'bg-[#86efac] animate-pulse'
                : connectionStatus === 'reconnecting'
                ? 'bg-[#fcd34d] animate-ping'
                : 'bg-[#f87171]'
            }`}
          />
          <h3 className="text-xs font-medium text-[#f7f7f9] tracking-tight font-mono">
            Telemetría Reciente
          </h3>
        </div>

        <div className="text-[11px] font-mono text-[#9b9baa]">
          {events.length} sismos
        </div>
      </div>

      {/* Events Scrollable List */}
      <div className="flex-grow overflow-y-auto divide-y divide-[#1e1715]">
        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center text-[#737384]">
            <p className="text-xs font-mono">Esperando eventos sísmicos...</p>
          </div>
        ) : (
          events.map((evt) => {
            const isSelected = selectedEventId === evt.id;
            const magColor = getMagnitudeColor(evt.mag);

            return (
              <div
                key={evt.id}
                onClick={() => onSelectEvent(evt)}
                className={`p-3 transition-all duration-150 cursor-pointer flex items-center justify-between gap-3 ${
                  isSelected
                    ? 'bg-[#241a2e]/50 border-l-2 border-[#844dea]'
                    : 'hover:bg-[#191412]'
                }`}
              >
                {/* Magnitude Badge */}
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className="w-10 h-10 rounded-lg flex flex-col items-center justify-center font-mono font-bold shrink-0 border"
                    style={{
                      backgroundColor: `${magColor}15`,
                      borderColor: `${magColor}40`,
                      color: magColor,
                    }}
                  >
                    <span className="text-xs leading-none">{evt.mag.toFixed(1)}</span>
                    <span className="text-[8px] uppercase tracking-wider opacity-70 mt-0.5">Mw</span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-xs font-medium text-[#dedee6] truncate">
                        {evt.place || 'Epicentro no especificado'}
                      </h4>
                      {evt.tsunami === 1 && (
                        <span
                          title="Alerta de Tsunami Emitida"
                          className="px-1 py-0.2 rounded text-[8px] font-mono font-bold uppercase bg-[#291418] text-[#fca5a5] border border-[#521b25] flex items-center gap-0.5 shrink-0"
                        >
                          <Waves className="w-2.5 h-2.5" />
                          TSUNAMI
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-0.5 text-[10px] font-mono text-[#9b9baa]">
                      <span>Prof: {evt.depth_km != null ? `${evt.depth_km.toFixed(1)} km` : '—'}</span>
                      <span>&bull;</span>
                      <span>{new Date(evt.time).toLocaleTimeString()} UTC</span>
                    </div>
                  </div>
                </div>

                <ChevronRight className="w-3.5 h-3.5 text-[#5c4d47] shrink-0" />
              </div>
            );
          })
        )}
      </div>

      {/* Feed Footer */}
      <div className="p-2 bg-[#171211] border-t border-[#241c19] text-center text-[10px] font-mono text-[#737384]">
        Capa Curated &bull; Validación Pandera
      </div>
    </div>
  );
};
