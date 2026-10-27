import React from 'react';
import { Search, SlidersHorizontal, RefreshCw, Waves } from 'lucide-react';

interface FiltersBarProps {
  timeRange: string;
  onTimeRangeChange: (range: string) => void;
  minMagnitude: number;
  onMinMagnitudeChange: (mag: number) => void;
  searchRegion: string;
  onSearchRegionChange: (search: string) => void;
  onlyTsunami: boolean;
  onOnlyTsunamiChange: (only: boolean) => void;
  onRefresh: () => void;
  loading: boolean;
}

export const FiltersBar: React.FC<FiltersBarProps> = ({
  timeRange,
  onTimeRangeChange,
  minMagnitude,
  onMinMagnitudeChange,
  searchRegion,
  onSearchRegionChange,
  onlyTsunami,
  onOnlyTsunamiChange,
  onRefresh,
  loading,
}) => {
  const timeRanges = [
    { id: '1h', label: '1 Hora' },
    { id: '24h', label: '24 Horas' },
    { id: '7d', label: '7 Días' },
    { id: '30d', label: '30 Días' },
  ];

  return (
    <div className="bg-dark-900/90 backdrop-blur-md border border-white/10 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-lg">
      {/* Time Range Pills */}
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider mr-1 hidden sm:inline">
          Ventana:
        </span>
        {timeRanges.map((r) => (
          <button
            key={r.id}
            onClick={() => onTimeRangeChange(r.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all ${
              timeRange === r.id
                ? 'bg-cobalt-500 text-white shadow-glow-cobalt'
                : 'bg-dark-950 text-slate-400 hover:text-white hover:bg-dark-850 border border-white/5'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Magnitude Slider */}
      <div className="flex items-center gap-2.5 px-3 py-1.5 bg-dark-950 rounded-xl border border-white/5">
        <SlidersHorizontal className="w-3.5 h-3.5 text-cobalt-400" />
        <span className="text-xs font-mono text-slate-300">
          Mag ≥ <span className="font-bold text-amber-400">{minMagnitude.toFixed(1)}</span>
        </span>
        <input
          type="range"
          min="0"
          max="7"
          step="0.5"
          value={minMagnitude}
          onChange={(e) => onMinMagnitudeChange(parseFloat(e.target.value))}
          className="w-20 sm:w-28 accent-cobalt-500 cursor-pointer"
        />
      </div>

      {/* Tsunami Toggle */}
      <label className="flex items-center gap-1.5 px-3 py-1.5 bg-dark-950 rounded-xl border border-white/5 text-xs font-mono text-slate-300 cursor-pointer hover:border-white/10 transition-colors">
        <input
          type="checkbox"
          checked={onlyTsunami}
          onChange={(e) => onOnlyTsunamiChange(e.target.checked)}
          className="w-3.5 h-3.5 accent-rose-500 rounded cursor-pointer"
        />
        <Waves className={`w-3.5 h-3.5 ${onlyTsunami ? 'text-rose-400' : 'text-slate-500'}`} />
        <span>Solo Tsunami</span>
      </label>

      {/* Region Search Input & Refresh */}
      <div className="flex items-center gap-2 flex-grow sm:flex-grow-0 sm:w-64">
        <div className="relative w-full">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Filtrar por región..."
            value={searchRegion}
            onChange={(e) => onSearchRegionChange(e.target.value)}
            className="w-full bg-dark-950 border border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-cobalt-500"
          />
        </div>

        <button
          onClick={onRefresh}
          disabled={loading}
          title="Refrescar datos en tiempo real"
          className="p-2 bg-dark-950 hover:bg-dark-850 text-slate-300 hover:text-white rounded-xl border border-white/10 transition-colors disabled:opacity-50 flex-shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cobalt-400' : ''}`} />
        </button>
      </div>
    </div>
  );
};
