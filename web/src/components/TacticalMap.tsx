import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Layers, Eye, Navigation, Building2, ShieldAlert } from 'lucide-react';
import { EarthquakeEvent, SeismicAnomaly, SuperAppHub } from '../types';
import { computeHubImpacts } from '../data/superAppHubs';

interface TacticalMapProps {
  events: EarthquakeEvent[];
  anomalies?: SeismicAnomaly[];
  selectedEvent?: EarthquakeEvent | null;
  onSelectEvent?: (event: EarthquakeEvent) => void;
}

type MapLayerType = 'satellite' | 'dark' | 'streets';

const REGIONAL_PRESETS = [
  { id: 'global', name: 'Global', lat: 20.0, lng: 0.0, zoom: 2 },
  { id: 'andes', name: 'Andes / LatAm', lat: -15.0, lng: -75.0, zoom: 4 },
  { id: 'ringoffire', name: 'Cinturón Pacífico', lat: 10.0, lng: 165.0, zoom: 3 },
  { id: 'japan', name: 'Japón / Asia', lat: 36.0, lng: 139.0, zoom: 5 },
  { id: 'sanandreas', name: 'San Andrés / USA', lat: 36.5, lng: -120.0, zoom: 5 },
  { id: 'mediterranean', name: 'Mediterráneo', lat: 37.0, lng: 20.0, zoom: 4 },
];

const MAP_TILES = {
  satellite: {
    name: 'Satélite',
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
  if (mag < 3.0) return '#86efac'; // Menta suave
  if (mag < 4.5) return '#fcd34d'; // Ámbar champaña
  if (mag < 6.0) return '#fb923c'; // Terracota
  return '#f87171'; // Carmesí sobrio
}

function getMagnitudeRadius(mag: number): number {
  if (mag <= 0) return 4;
  return Math.max(5, Math.min(20, mag * 3.0));
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
  const platesLayerRef = useRef<L.GeoJSON | null>(null);
  const hubsLayerRef = useRef<L.LayerGroup | null>(null);

  const [currentLayer, setCurrentLayer] = useState<MapLayerType>('satellite');
  const [showSwarms, setShowSwarms] = useState(true);
  const [showPlates, setShowPlates] = useState(true);
  const [showHubs, setShowHubs] = useState(true);

  // Evaluación de impacto sísmico en Hubs Logísticos de SuperApp
  const computedHubs = useMemo(() => {
    return computeHubImpacts(events);
  }, [events]);

  const alertHubsCount = useMemo(() => {
    return computedHubs.filter((h) => h.status !== 'OPERATIVO').length;
  }, [computedHubs]);

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

    const initialTile = L.tileLayer(MAP_TILES.satellite.url, {
      maxZoom: MAP_TILES.satellite.maxZoom,
      attribution: MAP_TILES.satellite.attribution,
    }).addTo(map);

    baseLayerRef.current = initialTile;
    markersLayerRef.current = L.layerGroup().addTo(map);
    swarmsLayerRef.current = L.layerGroup().addTo(map);
    hubsLayerRef.current = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;

    const resizeTimer = setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      clearTimeout(resizeTimer);
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Handle Layer Switching
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
        color: '#c4b5fd',
        fillColor: '#d5c4fb',
        fillOpacity: 0.18,
        weight: 1.5,
        dashArray: '5, 5',
      });

      const popupHtml = `
        <div style="font-family: inherit; color: #ececf1; padding: 4px; min-width: 190px;">
          <div style="display: flex; align-items: center; gap: 6px; font-weight: 700; font-size: 10px; text-transform: uppercase; color: #d5c4fb; border-bottom: 1px solid rgba(213,196,251,0.2); padding-bottom: 3px; margin-bottom: 5px;">
            <span>Enjambre Sísmico</span>
          </div>
          <div style="font-weight: 600; font-size: 12px; color: #ffffff; margin-bottom: 3px;">${swarm.region || 'Zona de Enjambre'}</div>
          <div style="font-size: 11px; color: #9b9baa; margin-bottom: 6px; line-height: 1.3;">${swarm.explanation || 'Concentración espacio-temporal detectada.'}</div>
          <div style="background: rgba(40,30,55,0.6); border: 1px solid rgba(213,196,251,0.2); border-radius: 6px; padding: 5px; font-family: monospace; font-size: 10px; color: #ececf1;">
            <div>Eventos: <strong>${swarm.cluster_size || '—'}</strong></div>
            <div>Radio: <strong>${swarm.radius_km?.toFixed(1) || '—'} km</strong></div>
            <div>Pico: <strong style="color: #fca5a5;">${swarm.max_magnitude?.toFixed(1) || '—'} Mw</strong></div>
          </div>
        </div>
      `;

      circle.bindPopup(popupHtml, { className: 'sismowatch-custom-popup' });
      swarmsLayerRef.current?.addLayer(circle);
    });
  }, [anomalies, showSwarms]);

  // Load and render Tectonic Plates in Leaflet
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    if (!showPlates) {
      if (platesLayerRef.current) {
        map.removeLayer(platesLayerRef.current);
        platesLayerRef.current = null;
      }
      return;
    }

    fetch('/tectonic-plates.json')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data || !mapInstanceRef.current) return;
        if (platesLayerRef.current) {
          mapInstanceRef.current.removeLayer(platesLayerRef.current);
        }

        const layer = L.geoJSON(data, {
          style: (feature) => {
            const isSubduction = String(feature?.properties?.Type || '').toLowerCase().includes('subduction');
            return {
              color: isSubduction ? '#f43f5e' : '#f59e0b',
              weight: 1.6,
              opacity: 0.75,
              dashArray: '4, 4',
            };
          },
          onEachFeature: (feature, layer) => {
            const name = feature.properties?.Name || 'Falla Tectónica';
            const type = feature.properties?.Type || 'Límite de Placa';
            layer.bindTooltip(`Falla: ${name} (${type})`, {
              sticky: true,
              className: 'font-mono text-xs bg-[#171211] text-[#f7f7f9] border-[#2c221f]',
            });
          },
        }).addTo(map);

        platesLayerRef.current = layer;
      })
      .catch((err) => console.warn('No se pudo cargar placas en 2D:', err));
  }, [showPlates]);

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
        fillOpacity: 0.85,
        color: isCritical ? '#ffffff' : '#120e0d',
        weight: isCritical ? 2.0 : 1.2,
      });

      const popupHtml = `
        <div style="font-family: inherit; color: #ececf1; padding: 4px; min-width: 210px;">
          <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 5px; margin-bottom: 5px;">
            <span style="background: ${color}; color: #120e0d; font-weight: 700; font-size: 10px; padding: 2px 6px; border-radius: 4px; font-family: monospace;">
              ${evt.mag.toFixed(1)} Mw
            </span>
            <span style="font-size: 10px; color: #9b9baa; font-family: monospace;">
              ${new Date(evt.time).toLocaleTimeString()} UTC
            </span>
          </div>
          <div style="font-weight: 600; font-size: 11px; color: #ffffff; margin-bottom: 5px; line-height: 1.3;">
            ${evt.place || 'Epicentro no especificado'}
          </div>
          <div style="font-family: monospace; font-size: 10px; color: #9b9baa; line-height: 1.5; background: rgba(22,17,16,0.6); padding: 5px; border-radius: 6px;">
            <div>Profundidad: <strong style="color: #f7f7f9;">${evt.depth_km != null ? evt.depth_km.toFixed(1) : '—'} km</strong></div>
            <div>Coordenadas: <strong style="color: #f7f7f9;">${evt.latitude.toFixed(2)}, ${evt.longitude.toFixed(2)}</strong></div>
            ${evt.tsunami === 1 ? '<div style="color: #f87171; font-weight: 700; margin-top: 2px;">⚠️ ALERTA TSUNAMI ACTIVA</div>' : ''}
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

  // Render SuperApp Logistics Hubs
  useEffect(() => {
    if (!hubsLayerRef.current) return;
    hubsLayerRef.current.clearLayers();

    if (!showHubs) return;

    computedHubs.forEach((hub) => {
      const isEvac = hub.status === 'EVACUACIÓN_INMEDIATA';
      const isWarn = hub.status === 'ALERTA_PRECAUCIÓN';
      const bgColor = isEvac ? '#ef4444' : isWarn ? '#f59e0b' : '#0ea5e9';
      const statusText = isEvac ? 'EVACUACIÓN INMEDIATA' : isWarn ? 'ALERTA PRECAUCIÓN' : 'OPERATIVO';

      const customIcon = L.divIcon({
        className: 'superapp-hub-div-icon',
        html: `
          <div style="
            display: flex;
            align-items: center;
            justify-content: center;
            width: 26px;
            height: 26px;
            border-radius: 6px;
            background: ${bgColor};
            border: 2px solid #ffffff;
            box-shadow: 0 0 ${isEvac || isWarn ? '10px' : '4px'} ${bgColor};
            font-size: 13px;
            cursor: pointer;
          " title="${hub.name}">
            ${isEvac ? '🚨' : isWarn ? '⚠️' : '🏢'}
          </div>
        `,
        iconSize: [26, 26],
        iconAnchor: [13, 13],
      });

      const marker = L.marker([hub.latitude, hub.longitude], { icon: customIcon });

      const popupHtml = `
        <div style="font-family: inherit; color: #ececf1; padding: 4px; min-width: 230px;">
          <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 5px; margin-bottom: 6px;">
            <span style="font-family: monospace; font-size: 10px; font-weight: 700; color: #38bdf8;">🏢 HUB SUPERAPP</span>
            <span style="background: ${isEvac ? 'rgba(239,68,68,0.2)' : isWarn ? 'rgba(245,158,11,0.2)' : 'rgba(16,185,129,0.2)'}; color: ${bgColor}; border: 1px solid ${bgColor}; font-weight: 700; font-size: 9px; padding: 1px 5px; border-radius: 4px;">
              ${statusText}
            </span>
          </div>
          <div style="font-weight: 700; font-size: 12px; color: #ffffff; margin-bottom: 2px;">${hub.name}</div>
          <div style="font-size: 11px; color: #9b9baa; margin-bottom: 6px;">${hub.city}, ${hub.country}</div>
          <div style="background: rgba(22,17,16,0.7); border: 1px solid rgba(255,255,255,0.08); border-radius: 6px; padding: 6px; font-family: monospace; font-size: 10px; color: #ececf1; line-height: 1.5;">
            <div>Flota Activa: <strong style="color: #38bdf8;">${hub.activeCouriers} mensajeros</strong></div>
            <div>Sismo Cercano: <strong style="color: ${hub.nearestEventDistanceKm !== undefined && hub.nearestEventDistanceKm < 150 ? '#f59e0b' : '#9b9baa'};">${hub.nearestEventDistanceKm !== undefined ? `${hub.nearestEventDistanceKm} km` : 'Ninguno'}</strong></div>
            ${hub.triggerEventMag ? `<div style="color: #f87171;">Activador: <strong>M ${hub.triggerEventMag.toFixed(1)}</strong> (${hub.triggerEventPlace || 'Epicentro'})</div>` : ''}
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml, { className: 'sismowatch-custom-popup' });
      hubsLayerRef.current?.addLayer(marker);
    });
  }, [computedHubs, showHubs]);

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
    <div className="relative w-full h-[540px] rounded-xl overflow-hidden border border-[#241c19] bg-[#120e0d] shadow-sm flex flex-col">
      {/* Top Map Tactical HUD Toolbar */}
      <div className="absolute top-3 left-3 z-[20] flex items-center gap-2 bg-[#171211]/90 backdrop-blur-md px-2.5 py-1.5 rounded-lg border border-[#2c221f] shadow-sm font-mono text-[11px]">
        <div className="flex items-center gap-1.5 text-[#f7f7f9]">
          <Eye className="w-3.5 h-3.5 text-[#d5c4fb]" />
          <span className="font-medium">Cartografía ({events.length})</span>
        </div>

        <div className="h-3 w-px bg-[#2c221f] mx-0.5" />

        {/* Toggle Layer */}
        <div className="flex items-center gap-0.5 bg-[#120e0d] p-0.5 rounded-md border border-[#201917]">
          <button
            onClick={() => setCurrentLayer('satellite')}
            className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all ${
              currentLayer === 'satellite'
                ? 'bg-[#844dea] text-white shadow-xs'
                : 'text-[#9b9baa] hover:text-[#f7f7f9]'
            }`}
          >
            Satélite
          </button>
          <button
            onClick={() => setCurrentLayer('dark')}
            className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all ${
              currentLayer === 'dark'
                ? 'bg-[#844dea] text-white shadow-xs'
                : 'text-[#9b9baa] hover:text-[#f7f7f9]'
            }`}
          >
            Oscuro
          </button>
          <button
            onClick={() => setCurrentLayer('streets')}
            className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all ${
              currentLayer === 'streets'
                ? 'bg-[#844dea] text-white shadow-xs'
                : 'text-[#9b9baa] hover:text-[#f7f7f9]'
            }`}
          >
            Calles
          </button>
        </div>

        <div className="h-3 w-px bg-[#2c221f] mx-0.5" />

        {/* Toggle Swarms */}
        <label className="flex items-center gap-1.5 text-[#d5c4fb] cursor-pointer hover:text-white transition-colors">
          <input
            type="checkbox"
            checked={showSwarms}
            onChange={(e) => setShowSwarms(e.target.checked)}
            className="w-3 h-3 accent-[#844dea] rounded cursor-pointer"
          />
          <span className="text-[10px]">Enjambres</span>
        </label>

        <div className="h-3 w-px bg-[#2c221f] mx-0.5" />

        {/* Toggle Tectonic Plates */}
        <label className="flex items-center gap-1.5 text-[#fcd34d] cursor-pointer hover:text-white transition-colors">
          <input
            type="checkbox"
            checked={showPlates}
            onChange={(e) => setShowPlates(e.target.checked)}
            className="w-3 h-3 accent-[#f59e0b] rounded cursor-pointer"
          />
          <span className="text-[10px]">Placas</span>
        </label>

        <div className="h-3 w-px bg-[#2c221f] mx-0.5" />

        {/* Toggle SuperApp Hubs */}
        <label className="flex items-center gap-1.5 text-[#38bdf8] cursor-pointer hover:text-white transition-colors">
          <input
            type="checkbox"
            checked={showHubs}
            onChange={(e) => setShowHubs(e.target.checked)}
            className="w-3 h-3 accent-[#0284c7] rounded cursor-pointer"
          />
          <span className="text-[10px]">Hubs ({computedHubs.length})</span>
        </label>
      </div>

      {/* Regional Camera Presets */}
      <div className="absolute top-3 right-3 z-[20] hidden lg:flex items-center gap-1 bg-[#171211]/90 backdrop-blur-md px-2 py-1 rounded-lg border border-[#2c221f] text-[10px] font-mono shadow-sm">
        <Navigation className="w-3 h-3 text-[#d5c4fb]" />
        <span className="text-[#9b9baa] font-medium mr-0.5">Vuelo:</span>
        {REGIONAL_PRESETS.map((p) => (
          <button
            key={p.id}
            onClick={() => mapInstanceRef.current?.flyTo([p.lat, p.lng], p.zoom, { duration: 1.2 })}
            className="px-1.5 py-0.5 rounded hover:bg-[#2c221f] text-[#d5c4fb] hover:text-white transition-colors cursor-pointer"
            title={`Centrar mapa en ${p.name}`}
          >
            {p.name}
          </button>
        ))}
      </div>

      {/* Hubs Risk Alert Notification Banner */}
      {showHubs && alertHubsCount > 0 && (
        <div className="absolute bottom-12 left-3 z-[20] flex items-center gap-1.5 bg-rose-500/20 border border-rose-500/40 text-rose-200 px-2.5 py-1 rounded-lg text-[10px] font-mono shadow-md backdrop-blur-md animate-pulse">
          <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
          <span>{alertHubsCount} Hub(s) SuperApp en radio de impacto</span>
        </div>
      )}

      {/* Magnitude Legend Indicator */}
      <div className="absolute bottom-3 right-3 z-[20] hidden sm:flex items-center gap-2.5 bg-[#171211]/90 backdrop-blur-md px-2.5 py-1 rounded-lg border border-[#2c221f] text-[10px] font-mono text-[#9b9baa]">
        <span className="uppercase text-[9px] font-medium">Escala:</span>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-[#86efac]" />
          <span>&lt; 3.0</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-[#fcd34d]" />
          <span>3.0 - 4.5</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-[#fb923c]" />
          <span>4.5 - 6.0</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-[#f87171]" />
          <span>&ge; 6.0</span>
        </div>
        <div className="h-2.5 w-px bg-[#2c221f] mx-0.5" />
        <div className="flex items-center gap-1">
          <span className="text-[10px]">🏢</span>
          <span className="text-[#38bdf8]">Hubs</span>
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
