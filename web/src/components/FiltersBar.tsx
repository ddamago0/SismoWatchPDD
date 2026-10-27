import React from 'react';
import { Search, Filter, RefreshCw, SlidersHorizontal } from 'lucide-react';

interface FiltersBarProps {
  timeRange: string;
  onTimeRangeChange: (range: string) => void;
  minMagnitude: number;
  onMinMagnitudeChange: (mag: number) => void;
  searchRegion: string;
  onSearchRegionChange: (search: string) => void;
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
  onRefresh,
  loading,
}) => {
  const timeRanges = [
    { id: '1h', label: 'Última 1h' },
    { id: '24h', label: '24 Horas' },
    { id: '7d', label: '7 Días' },
    { id: '30d', label: '30 Días' },
  ];

  return (
    <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-4">
      {/* Time Range Pills */}
      <div className="flex items-center gap-1.5">
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mr-1 hidden sm:inline">
          Período:
        </span>
        {timeRanges.map((r) => (
          <button
            key={r.id}
            onClick={() => onTimeRangeChange(r.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              timeRange === r.id
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700/80'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Magnitude Slider */}
      <div className="flex items-center gap-2.5">
        <SlidersHorizontal className="w-4 h-4 text-slate-400" />
        <span className="text-xs text-slate-300 font-medium">
          Mag ≥ <span className="font-bold text-amber-400">{minMagnitude.toFixed(1)}</span>
        </span>
        <input
          type="range"
          min="0"
          max="8"
          step="0.5"
          value={minMagnitude}
          onChange={(e) => onMinMagnitudeChange(parseFloat(e.target.value))}
          className="w-24 sm:w-32 accent-indigo-500 cursor-pointer"
        />
      </div>

      {/* Region Search Input */}
      <div className="flex items-center gap-2 flex-grow sm:flex-grow-0 sm:w-64">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Filtrar por región..."
            value={searchRegion}
            onChange={(e) => onSearchRegionChange(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Refresh Button */}
      <button
        onClick={onRefresh}
        disabled={loading}
        title="Refrescar datos"
        className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700 transition-colors disabled:opacity-50"
      >
        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
      </button>
    </div>
  );
};

