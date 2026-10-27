import React from 'react';
import { EarthquakeEvent } from '../types';
import { ExternalLink, Waves, ChevronLeft, ChevronRight, Layers } from 'lucide-react';

interface EventsTableProps {
  events: EarthquakeEvent[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  onPageChange: (newPage: number) => void;
  loading: boolean;
}

function getMagnitudeBadge(mag: number) {
  if (mag < 3.0) {
    return (
      <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-[#14231b] text-[#86efac] border border-[#234231]/60">
        {mag.toFixed(1)} Leve
      </span>
    );
  }
  if (mag < 4.5) {
    return (
      <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-[#292214] text-[#fde047] border border-[#4a3b1d]/60">
        {mag.toFixed(1)} Moderado
      </span>
    );
  }
  if (mag < 6.0) {
    return (
      <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-[#2c1a16] text-[#fb923c] border border-[#4c2d24]/60">
        {mag.toFixed(1)} Fuerte
      </span>
    );
  }
  return (
    <span className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-[#2b1418] text-[#f87171] border border-[#4f2026]/70 animate-pulse">
      {mag.toFixed(1)} Crítico
    </span>
  );
}

export const EventsTable: React.FC<EventsTableProps> = ({
  events,
  total,
  page,
  totalPages,
  onPageChange,
  loading,
}) => {
  return (
    <div className="bg-[#171211] border border-[#261f1c] rounded-2xl overflow-hidden shadow-sm">
      <div className="p-4 border-b border-[#261f1c] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-[#241a2e] text-[#d5c4fb] rounded-xl border border-[#4a365f]/40">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-mono font-semibold text-[#f7f7f9] uppercase tracking-wider">
              Registro Detallado de Eventos Sísmicos
            </h3>
            <p className="text-[10px] text-[#9b9baa] font-mono">
              Capa Gold (`curated.earthquakes_curated`) &bull; Total: {total} registros
            </p>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-[#ececf1]">
          <thead className="bg-[#120e0d] text-[10px] uppercase font-mono font-semibold text-[#9b9baa] tracking-wider border-b border-[#261f1c]">
            <tr>
              <th className="px-4 py-3">Magnitud</th>
              <th className="px-4 py-3">Ubicación</th>
              <th className="px-4 py-3">Fecha y Hora (UTC)</th>
              <th className="px-4 py-3">Profundidad</th>
              <th className="px-4 py-3">Coordenadas</th>
              <th className="px-4 py-3">Tsunami</th>
              <th className="px-4 py-3 text-right">Detalle</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#241c19] font-sans">
            {events.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-[#9b9baa] font-mono text-xs">
                  {loading ? 'Cargando eventos...' : 'No hay eventos sísmicos disponibles.'}
                </td>
              </tr>
            ) : (
              events.map((evt) => (
                <tr key={evt.id} className="hover:bg-[#1e1715] transition-colors duration-150">
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    {getMagnitudeBadge(evt.mag)}
                  </td>
                  <td className="px-4 py-2.5 text-[#f7f7f9] font-medium max-w-xs truncate" title={evt.place}>
                    {evt.place || 'Sin registrar'}
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap text-[#9b9baa] font-mono text-[11px]">
                    {new Date(evt.time).toLocaleString()}
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap font-mono text-[11px]">
                    {evt.depth_km} km
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap text-[#9b9baa] font-mono text-[11px]">
                    {evt.latitude.toFixed(2)}°, {evt.longitude.toFixed(2)}°
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    {evt.tsunami === 1 ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-mono font-medium text-[#f87171] bg-[#2b1418] px-2 py-0.5 rounded border border-[#4f2026]/70">
                        <Waves className="w-3 h-3" /> Alerta
                      </span>
                    ) : (
                      <span className="text-[#9b9baa] text-[11px] font-mono">No</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right whitespace-nowrap font-mono">
                    {evt.url ? (
                      <a
                        href={evt.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[#d5c4fb] hover:text-[#f7f7f9] transition-colors"
                      >
                        <span>USGS</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="p-3 border-t border-[#261f1c] flex items-center justify-between bg-[#140f0e] text-xs font-mono text-[#9b9baa]">
        <div>
          Página <span className="font-semibold text-[#f7f7f9]">{page}</span> de{' '}
          <span className="font-semibold text-[#f7f7f9]">{Math.max(1, totalPages)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1 || loading}
            className="p-1.5 rounded-lg bg-[#1f1715] hover:bg-[#281e1b] text-[#ececf1] disabled:opacity-40 disabled:hover:bg-[#1f1715] border border-[#2b211e] transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages || loading}
            className="p-1.5 rounded-lg bg-[#1f1715] hover:bg-[#281e1b] text-[#ececf1] disabled:opacity-40 disabled:hover:bg-[#1f1715] border border-[#2b211e] transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
