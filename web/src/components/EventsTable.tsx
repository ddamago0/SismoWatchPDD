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
    return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">{mag.toFixed(1)} Leve</span>;
  }
  if (mag < 4.5) {
    return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">{mag.toFixed(1)} Moderado</span>;
  }
  if (mag < 6.0) {
    return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-orange-500/20 text-orange-300 border border-orange-500/30">{mag.toFixed(1)} Fuerte</span>;
  }
  return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse">{mag.toFixed(1)} Crítico</span>;
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
    <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-xl overflow-hidden shadow-sm">
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-indigo-500/10 text-indigo-400 rounded-lg">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Registro Detallado de Eventos Sísmicos
            </h3>
            <p className="text-[10px] text-slate-400">
              Capa Gold (`curated.earthquakes_curated`) — Total: {total} registros
            </p>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-950/60 text-[10px] uppercase font-bold text-slate-400 tracking-wider border-b border-slate-800">
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
          <tbody className="divide-y divide-slate-800/60 font-medium">
            {events.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                  {loading ? 'Cargando eventos...' : 'No hay eventos sísmicos disponibles.'}
                </td>
              </tr>
            ) : (
              events.map((evt) => (
                <tr key={evt.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    {getMagnitudeBadge(evt.mag)}
                  </td>
                  <td className="px-4 py-2.5 text-white font-semibold max-w-xs truncate" title={evt.place}>
                    {evt.place || 'Sin registrar'}
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap text-slate-400">
                    {new Date(evt.time).toLocaleString()}
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    {evt.depth_km} km
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap text-slate-400 text-[11px]">
                    {evt.latitude.toFixed(2)}°, {evt.longitude.toFixed(2)}°
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    {evt.tsunami === 1 ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/30">
                        <Waves className="w-3 h-3" /> Alerta
                      </span>
                    ) : (
                      <span className="text-slate-500 text-[11px]">No</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right whitespace-nowrap">
                    {evt.url ? (
                      <a
                        href={evt.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-semibold"
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
      <div className="p-3 border-t border-slate-800 flex items-center justify-between bg-slate-950/40 text-xs text-slate-400">
        <div>
          Página <span className="font-bold text-white">{page}</span> de{' '}
          <span className="font-bold text-white">{Math.max(1, totalPages)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1 || loading}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 disabled:hover:bg-slate-800 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages || loading}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 disabled:hover:bg-slate-800 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

