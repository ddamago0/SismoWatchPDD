import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { EarthquakeEvent, SeismicAnomaly } from '../types';
import { Layers, Zap, Eye, Compass, RefreshCw } from 'lucide-react';

interface TacticalMapProps {
  events: EarthquakeEvent[];
  anomalies?: SeismicAnomaly[];
  selectedEvent?: EarthquakeEvent | null;
  onSelectEvent?: (event: EarthquakeEvent) => void;
}

type MapLayerType = 'satellite' | 'dark' | 'streets';

const MAP_TILES = {
  satellite: {
    name: 'Satélite (God\'s Eye)',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    maxZoom: 18,
    attribution: 'Tiles &copy; Esri &mdash; NASA / USGS / Maxar',
  },
  dark: {
    name: 'Canvas Táctico',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    maxZoom: 16,
    attribution: 'Tiles &copy; Esri &mdash; Esri DeLorme',
  },
  streets: {
    name: 'Calles (OSM)',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors',
  },
};

function getMagnitudeColor(mag: number): string {
  if (mag < 3.0) return '#10b981'; // Verde Neón
  if (mag < 4.5) return '#f59e0b'; // Ámbar
  if (mag < 6.0) return '#f97316'; // Naranja
  return '#ef4444'; // Rojo Carmesí
}

function getMagnitudeRadius(mag: number): number {
  if (mag <= 0) return 4;
  return Math.max(5, Math.min(22, mag * 3.2));
}

export const TacticalMap: React.FC<TacticalMapProps> = ({
  events,
  anomalies = [],
  selectedEvent,
  onSelectEvent,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const baseLayerRef = useRef<L.TileLayer | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const swarmsLayerRef = useRef<L.LayerGroup | null>(null);

  const [currentLayer, setCurrentLayer] = useState<MapLayerType>('satellite');
  const [showSwarms, setShowSwarms] = useState(true);

  // Initialize Native Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [20.0, 0.0],
      zoom: 2,
      minZoom: 2,
      maxZoom: 18,
      zoomControl: true,
      attributionControl: false,
    });

    // Initial Tile Layer: Esri World Imagery (Satellite)
    const initialTile = L.tileLayer(MAP_TILES.satellite.url, {
      maxZoom: MAP_TILES.satellite.maxZoom,
      attribution: MAP_TILES.satellite.attribution,
    }).addTo(map);

    baseLayerRef.current = initialTile;
    markersLayerRef.current = L.layerGroup().addTo(map);
    swarmsLayerRef.current = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;

    // Force map layout computation to prevent grey / cut-off tiles
    const resizeTimer = setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      clearTimeout(resizeTimer);
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Handle Layer Switching (Satellite vs Dark vs Streets)
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    if (baseLayerRef.current) {
      map.removeLayer(baseLayerRef.current);
    }

    const cfg = MAP_TILES[currentLayer];
    const newLayer = L.tileLayer(cfg.url, {
      maxZoom: cfg.maxZoom,
      attribution: cfg.attribution,
    }).addTo(map);

    baseLayerRef.current = newLayer;
  }, [currentLayer]);

  // Update Swarm Anomalies (Enjambres Sísmicos)
  useEffect(() => {
    if (!swarmsLayerRef.current) return;
    swarmsLayerRef.current.clearLayers();

    if (!showSwarms) return;

    const swarms = anomalies.filter(
      (a) => a.type === 'SEISMIC_SWARM_EVENT' && a.latitude != null && a.longitude != null
    );

    swarms.forEach((swarm) => {
      const radiusMeters = Math.max(15000, (swarm.radius_km || 25) * 1000);

      const circle = L.circle([swarm.latitude!, swarm.longitude!], {
        radius: radiusMeters,
        color: '#a855f7',
        fillColor: '#c084fc',
        fillOpacity: 0.22,
        weight: 2,
        dashArray: '6, 6',
      });

      const popupHtml = `
        <div style="font-family: ui-sans-serif, system-ui, sans-serif; color: #f8fafc; padding: 4px; min-width: 200px;">
          <div style="display: flex; align-items: center; gap: 6px; font-weight: 800; font-size: 11px; text-transform: uppercase; color: #c084fc; border-bottom: 1px solid rgba(168,85,247,0.3); padding-bottom: 4px; margin-bottom: 6px;">
            <span>⚡ Enjambre Sísmico (Swarm)</span>
          </div>
          <div style="font-weight: 700; font-size: 13px; color: #ffffff; margin-bottom: 4px;">${swarm.region || 'Zona de Enjambre'}</div>
          <div style="font-size: 11px; color: #cbd5e1; margin-bottom: 8px; line-height: 1.4;">${swarm.explanation || 'Concentración espacio-temporal detectada.'}</div>
          <div style="background: rgba(88,28,135,0.4); border: 1px solid rgba(168,85,247,0.3); border-radius: 8px; padding: 6px; font-family: ui-monospace, monospace; font-size: 11px; color: #e9d5ff;">
            <div>Eventos en racimo: <strong style="color: #ffffff;">${swarm.cluster_size || '—'}</strong></div>
            <div>Radio geodésico: <strong style="color: #ffffff;">${swarm.radius_km?.toFixed(1) || '—'} km</strong></div>
            <div>Magnitud pico: <strong style="color: #f43f5e;">${swarm.max_magnitude?.toFixed(1) || '—'} Mw</strong></div>
          </div>
        </div>
      `;

      circle.bindPopup(popupHtml, { className: 'sismowatch-custom-popup' });
      swarmsLayerRef.current?.addLayer(circle);
    });
  }, [anomalies, showSwarms]);

  // Update Earthquake Markers
  useEffect(() => {
    if (!markersLayerRef.current) return;
    markersLayerRef.current.clearLayers();

    events.forEach((evt) => {
      if (evt.latitude == null || evt.longitude == null) return;

      const color = getMagnitudeColor(evt.mag);
      const radius = getMagnitudeRadius(evt.mag);
      const isCritical = evt.mag >= 6.0 || evt.tsunami === 1;

      const marker = L.circleMarker([evt.latitude, evt.longitude], {
        radius,
        fillColor: color,
        fillOpacity: 0.88,
        color: isCritical ? '#ffffff' : '#0a0e17',
        weight: isCritical ? 2.5 : 1.5,
      });

      const popupHtml = `
        <div style="font-family: ui-sans-serif, system-ui, sans-serif; color: #f8fafc; padding: 4px; min-width: 220px;">
          <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 6px; margin-bottom: 6px;">
            <span style="background: ${color}; color: #ffffff; font-weight: 800; font-size: 11px; padding: 2px 7px; border-radius: 6px; font-family: ui-monospace, monospace;">
              ${evt.mag.toFixed(1)} Mw
            </span>
            <span style="font-size: 10px; color: #94a3b8; font-family: ui-monospace, monospace;">
              ${new Date(evt.time).toLocaleTimeString()} UTC
            </span>
          </div>
          <div style="font-weight: 700; font-size: 12px; color: #ffffff; margin-bottom: 6px; line-height: 1.3;">
            ${evt.place || 'Epicentro no especificado'}
          </div>
          <div style="font-family: ui-monospace, monospace; font-size: 10px; color: #94a3b8; line-height: 1.6; background: rgba(15,23,42,0.6); padding: 6px; border-radius: 6px;">
            <div>Profundidad: <strong style="color: #f1f5f9;">${evt.depth_km != null ? evt.depth_km.toFixed(1) : '—'} km</strong></div>
            <div>Coordenadas: <strong style="color: #f1f5f9;">${evt.latitude.toFixed(2)}, ${evt.longitude.toFixed(2)}</strong></div>
            ${evt.tsunami === 1 ? '<div style="color: #f43f5e; font-weight: 800; margin-top: 3px;">⚠️ ALERTA TSUNAMI ACTIVA</div>' : ''}
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml, { className: 'sismowatch-custom-popup' });

      marker.on('click', () => {
        if (onSelectEvent) onSelectEvent(evt);
      });

      markersLayerRef.current?.addLayer(marker);
    });
  }, [events, onSelectEvent]);

  // Fly to selected event
  useEffect(() => {
    if (!mapInstanceRef.current || !selectedEvent) return;
    if (selectedEvent.latitude != null && selectedEvent.longitude != null) {
      mapInstanceRef.current.flyTo([selectedEvent.latitude, selectedEvent.longitude], 6, {
        duration: 1.2,
      });
    }
  }, [selectedEvent]);

  return (
    <div className="relative w-full h-[540px] rounded-2xl overflow-hidden border border-slate-800 bg-[#060911] shadow-2xl flex flex-col">
      {/* Top Map Tactical HUD Toolbar */}
      <div className="absolute top-3 left-3 z-[20] flex items-center gap-2 bg-[#0a0f1d]/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700 shadow-xl font-mono text-[11px]">
        <div className="flex items-center gap-2 text-slate-200">
          <Eye className="w-3.5 h-3.5 text-blue-400" />
          <span className="font-bold tracking-wide">Cartografía ({events.length})</span>
        </div>

        <div className="h-3 w-px bg-slate-700 mx-1" />

        {/* Toggle Layer (Satellite vs Tactical vs Streets) */}
        <div className="flex items-center gap-1 bg-slate-900/90 p-0.5 rounded-lg border border-slate-800">
          <button
            onClick={() => setCurrentLayer('satellite')}
            className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
              currentLayer === 'satellite'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Satélite
          </button>
          <button
            onClick={() => setCurrentLayer('dark')}
            className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
              currentLayer === 'dark'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Oscuro
          </button>
          <button
            onClick={() => setCurrentLayer('streets')}
            className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
              currentLayer === 'streets'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Calles
          </button>
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
          <span className="text-[10px]">Enjambres</span>
        </label>
      </div>

      {/* Magnitude Legend Indicator */}
      <div className="absolute bottom-3 right-3 z-[20] hidden sm:flex items-center gap-3 bg-[#0a0f1d]/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700 text-[10px] font-mono text-slate-300">
        <span className="text-slate-400 uppercase font-bold">Escala Mw:</span>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>&lt; 3.0</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          <span>3.0 - 4.5</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-orange-500" />
          <span>4.5 - 6.0</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
          <span>&ge; 6.0</span>
        </div>
      </div>

      {/* Leaflet Map Div Container */}
      <div
        ref={mapContainerRef}
        className="w-full h-full"
        style={{ zIndex: 0, minHeight: '500px' }}
      />
    </div>
  );
};
