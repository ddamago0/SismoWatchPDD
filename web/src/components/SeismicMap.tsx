import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import { EarthquakeEvent, SeismicAnomaly } from '../types';
import { Zap, Layers, RefreshCw } from 'lucide-react';

interface SeismicMapProps {
  events: EarthquakeEvent[];
  anomalies?: SeismicAnomaly[];
  selectedEvent?: EarthquakeEvent | null;
  onSelectEvent?: (event: EarthquakeEvent) => void;
}

// Controller component to invalidate size and pan to selected event
const MapController: React.FC<{
  events: EarthquakeEvent[];
  selectedEvent?: EarthquakeEvent | null;
}> = ({ events, selectedEvent }) => {
  const map = useMap();

  useEffect(() => {
    // Invalidate size on mount and after render
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 200);
    return () => clearTimeout(timer);
  }, [map]);

  useEffect(() => {
    if (selectedEvent && selectedEvent.latitude != null && selectedEvent.longitude != null) {
      map.flyTo([selectedEvent.latitude, selectedEvent.longitude], 6, {
        duration: 1.2,
      });
    }
  }, [selectedEvent, map]);

  return null;
};

function getMagnitudeColor(mag: number): string {
  if (mag < 3.0) return '#10b981'; // Verde
  if (mag < 4.5) return '#f59e0b'; // Amarillo
  if (mag < 6.0) return '#f97316'; // Naranja
  return '#ef4444'; // Rojo carmesí
}

function getMagnitudeRadius(mag: number): number {
  if (mag <= 0) return 4;
  return Math.max(5, Math.min(22, mag * 3));
}

export const SeismicMap: React.FC<SeismicMapProps> = ({
  events,
  anomalies = [],
  selectedEvent,
  onSelectEvent,
}) => {
  const [showSwarms, setShowSwarms] = useState(true);
  const [useDarkFilter, setUseDarkFilter] = useState(true);

  const defaultCenter: [number, number] = [20, 0];
  const defaultZoom = 2;

  const swarmAnomalies = anomalies.filter(
    (a) => a.type === 'SEISMIC_SWARM_EVENT' && a.latitude != null && a.longitude != null
  );

  return (
    <div className="relative w-full h-[520px] rounded-2xl overflow-hidden border border-slate-800 bg-[#070c16] shadow-xl flex flex-col">
      {/* Top Map Toolbar */}
      <div className="absolute top-3 left-3 z-[25] flex items-center gap-2 bg-[#0b121e]/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700 shadow-lg font-mono text-[11px]">
        <div className="flex items-center gap-2 text-slate-200">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-bold">Cartografía Sísmica ({events.length})</span>
        </div>

        <div className="h-3 w-px bg-slate-700 mx-1" />

        {/* Toggle Swarms */}
        <label className="flex items-center gap-1.5 text-purple-300 cursor-pointer hover:text-white transition-colors">
          <input
            type="checkbox"
            checked={showSwarms}
            onChange={(e) => setShowSwarms(e.target.checked)}
            className="w-3.5 h-3.5 accent-purple-500 rounded cursor-pointer"
          />
          <span>Enjambres ({swarmAnomalies.length})</span>
        </label>

        {/* Toggle Dark Map Filter */}
        <button
          onClick={() => setUseDarkFilter(!useDarkFilter)}
          className="ml-1 px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 transition-colors"
        >
          {useDarkFilter ? 'Modo Oscuro' : 'Modo Estándar'}
        </button>
      </div>

      {/* Leaflet Map with Universal OSM Tiles (Unblocked by Brave Shields) */}
      <div className={`w-full h-full ${useDarkFilter ? 'osm-dark-tiles' : ''}`}>
        <MapContainer
          center={defaultCenter}
          zoom={defaultZoom}
          minZoom={1}
          maxZoom={14}
          style={{ width: '100%', height: '100%' }}
          scrollWheelZoom={true}
        >
          <MapController events={events} selectedEvent={selectedEvent} />

          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> | USGS Feed'
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
          />

          {/* Swarm Events (Enjambres Sísmicos Espaciales) */}
          {showSwarms &&
            swarmAnomalies.map((swarm) => (
              <CircleMarker
                key={`swarm-${swarm.id || swarm.event_id}`}
                center={[swarm.latitude!, swarm.longitude!]}
                radius={Math.max(25, (swarm.radius_km || 10) * 0.7)}
                pathOptions={{
                  color: '#a855f7',
                  fillColor: '#c084fc',
                  fillOpacity: 0.25,
                  weight: 2,
                  dashArray: '4, 4',
                }}
              >
                <Popup className="sismowatch-popup">
                  <div className="p-1 min-w-[210px] font-sans">
                    <div className="flex items-center gap-1.5 pb-1 mb-2 border-b border-purple-500/30 text-purple-400 font-mono font-bold text-xs uppercase tracking-wider">
                      <Zap className="w-3.5 h-3.5" />
                      <span>Enjambre Sísmico (Swarm)</span>
                    </div>
                    <h4 className="font-bold text-xs text-white mb-1">{swarm.region}</h4>
                    <p className="text-[11px] text-slate-300 mb-2 leading-relaxed">{swarm.explanation}</p>
                    <div className="text-[10px] space-y-0.5 text-purple-200 font-mono bg-purple-950/60 p-2 rounded-lg border border-purple-500/30">
                      <div>Eventos: <span className="font-bold text-white">{swarm.cluster_size}</span></div>
                      <div>Radio: <span className="font-bold text-white">{swarm.radius_km} km</span></div>
                      <div>Pico: <span className="font-bold text-purple-300">{swarm.max_magnitude} Mw</span></div>
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            ))}

          {/* Seismic Events Markers */}
          {events.map((evt) => {
            const color = getMagnitudeColor(evt.mag);
            const radius = getMagnitudeRadius(evt.mag);
            const isSelected = selectedEvent?.id === evt.id;

            return (
              <CircleMarker
                key={evt.id}
                center={[evt.latitude, evt.longitude]}
                radius={isSelected ? radius + 4 : radius}
                eventHandlers={{
                  click: () => onSelectEvent && onSelectEvent(evt),
                }}
                pathOptions={{
                  color: isSelected ? '#ffffff' : color,
                  fillColor: color,
                  fillOpacity: isSelected ? 0.95 : 0.7,
                  weight: isSelected ? 3 : 1.5,
                }}
              >
                <Popup className="sismowatch-popup">
                  <div className="p-1 min-w-[220px] font-sans">
                    <div className="flex items-center justify-between border-b border-slate-700 pb-1 mb-2">
                      <span
                        className="px-2 py-0.5 rounded text-white text-xs font-mono font-bold"
                        style={{ backgroundColor: color }}
                      >
                        {evt.mag.toFixed(1)} Mw
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        {new Date(evt.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} UTC
                      </span>
                    </div>

                    <h4 className="font-bold text-xs text-white mb-1.5 leading-snug">{evt.place}</h4>

                    <div className="text-[10px] font-mono space-y-1 bg-[#070b14] p-2 rounded-lg border border-slate-800 text-slate-300">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Profundidad:</span>
                        <span className="font-bold text-slate-200">{evt.depth_km.toFixed(1)} km</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Coordenadas:</span>
                        <span className="text-slate-400">
                          {evt.latitude.toFixed(2)}, {evt.longitude.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>
      </div>

      {/* Floating Legend */}
      <div className="absolute bottom-3 right-3 z-[25] bg-[#0b121e]/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700 text-[10px] font-mono shadow-xl flex items-center gap-3">
        <span className="text-slate-400 font-bold uppercase tracking-wider">Escala Mw:</span>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-[#10b981]" />
          <span className="text-slate-300">&lt; 3.0</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-[#f59e0b]" />
          <span className="text-slate-300">3.0 - 4.5</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-[#f97316]" />
          <span className="text-slate-300">4.5 - 6.0</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-[#ef4444]" />
          <span className="text-slate-300">&ge; 6.0</span>
        </div>
      </div>
    </div>
  );
};
