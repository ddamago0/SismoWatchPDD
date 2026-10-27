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
    { id: '1h', label: '1h' },
    { id: '24h', label: '24h' },
    { id: '7d', label: '7d' },
    { id: '30d', label: '30d' },
  ];

  return (
    <div className="bg-[#171211] border border-[#241c19] rounded-xl p-2.5 flex flex-wrap items-center justify-between gap-2.5 shadow-sm">
      {/* Time Range Pills */}
      <div className="flex items-center gap-1 bg-[#120e0d] p-0.5 rounded-lg border border-[#201917]">
        {timeRanges.map((r) => (
          <button
            key={r.id}
            onClick={() => onTimeRangeChange(r.id)}
            className={`px-2.5 py-1 rounded-md text-xs font-mono font-medium transition-all duration-150 ${
              timeRange === r.id
                ? 'bg-[#844dea] text-white shadow-sm'
                : 'text-[#9b9baa] hover:text-[#f7f7f9] hover:bg-[#1a1413]'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Magnitude Slider */}
      <div className="flex items-center gap-2 px-2.5 py-1 bg-[#120e0d] rounded-lg border border-[#201917]">
        <SlidersHorizontal className="w-3 h-3 text-[#d5c4fb]" />
        <span className="text-[11px] font-mono text-[#9b9baa]">
          Mag ≥ <span className="font-semibold text-[#f7f7f9]">{minMagnitude.toFixed(1)}</span>
        </span>
        <input
          type="range"
          min="0"
          max="7"
          step="0.5"
          value={minMagnitude}
          onChange={(e) => onMinMagnitudeChange(parseFloat(e.target.value))}
          className="w-16 sm:w-24 accent-[#844dea] cursor-pointer"
        />
      </div>

      {/* Tsunami Toggle */}
      <label className="flex items-center gap-1.5 px-2.5 py-1 bg-[#120e0d] rounded-lg border border-[#201917] text-xs font-mono text-[#9b9baa] cursor-pointer hover:border-[#382f2c] transition-colors">
        <input
          type="checkbox"
          checked={onlyTsunami}
          onChange={(e) => onOnlyTsunamiChange(e.target.checked)}
          className="w-3 h-3 accent-[#844dea] rounded cursor-pointer"
        />
        <Waves className={`w-3 h-3 ${onlyTsunami ? 'text-[#f87171]' : 'text-[#737384]'}`} />
        <span className={onlyTsunami ? 'text-[#f7f7f9] font-medium' : ''}>Tsunami</span>
      </label>

      {/* Region Search Input & Refresh */}
      <div className="flex items-center gap-1.5 flex-grow sm:flex-grow-0 sm:w-60">
        <div className="relative w-full">
          <Search className="w-3 h-3 text-[#737384] absolute left-2.5 top-2.5" />
          <input
            type="text"
            placeholder="Región..."
            value={searchRegion}
            onChange={(e) => onSearchRegionChange(e.target.value)}
            className="w-full bg-[#120e0d] border border-[#201917] rounded-lg pl-7 pr-2.5 py-1 text-xs font-mono text-[#ececf1] placeholder-[#5c4d47] focus:outline-none focus:border-[#844dea]"
          />
        </div>

        <button
          onClick={onRefresh}
          disabled={loading}
          title="Refrescar datos"
          className="p-1.5 bg-[#120e0d] hover:bg-[#1a1413] text-[#9b9baa] hover:text-[#f7f7f9] rounded-lg border border-[#201917] transition-colors disabled:opacity-50 shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#d5c4fb]' : ''}`} />
        </button>
      </div>
    </div>
  );
};
