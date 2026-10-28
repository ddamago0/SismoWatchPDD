import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Layers, Navigation, Building2, ShieldAlert, Radio, Waves, X, ChevronDown, ChevronUp, RotateCcw } from 'lucide-react';
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
    name: 'Calles',
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
  const [showFlightDropdown, setShowFlightDropdown] = useState(false);
  const [selectedPresetId, setSelectedPresetId] = useState('global');
  const [showLegend, setShowLegend] = useState(false);

  // Cierre de dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const container = document.getElementById('map2d-flight-dropdown-container');
      if (container && !container.contains(event.target as Node)) {
        setShowFlightDropdown(false);
      }
    };
    if (showFlightDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showFlightDropdown]);

  const resetView = () => {
    setSelectedPresetId('global');
    mapInstanceRef.current?.flyTo([20.0, 0.0], 2, { duration: 1.2 });
  };

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
            ${hub.triggerEventMag ? `<div style="color: #f87171;">Activador: <strong>M ${hub.triggerEventMag.toFixed(1)}</strong> · ${hub.triggerEventPlace || 'Epicentro'}</div>` : ''}
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
      {/* Cockpit HUD: Controles Superiores Compactos (Solo Iconos + Desplegable de Vuelo) */}
      <div className="absolute top-3 left-3 right-3 z-[500] flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Selector de Capa Base: Satélite / Oscuro / Calles */}
          <div className="flex items-center gap-0.5 bg-slate-900/90 backdrop-blur-md p-1 rounded-xl border border-slate-800 shadow-xl font-mono text-[11px]">
            <button
              onClick={() => setCurrentLayer('satellite')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                currentLayer === 'satellite'
                  ? 'bg-[#844dea] text-white shadow-xs font-semibold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
              title="Capa base: Satélite"
            >
              Satélite
            </button>
            <button
              onClick={() => setCurrentLayer('dark')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                currentLayer === 'dark'
                  ? 'bg-[#844dea] text-white shadow-xs font-semibold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
              title="Capa base: Lienzo Oscuro"
            >
              Oscuro
            </button>
            <button
              onClick={() => setCurrentLayer('streets')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                currentLayer === 'streets'
                  ? 'bg-[#844dea] text-white shadow-xs font-semibold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
              title="Capa base: Calles"
            >
              Calles
            </button>
          </div>

          {/* Grupo de Iconos de Herramientas Tácticas */}
          <div className="flex items-center gap-1 bg-slate-900/90 backdrop-blur-md p-1 rounded-xl border border-slate-800 shadow-xl">
            <button
              onClick={() => setShowSwarms(!showSwarms)}
              className={`p-2 rounded-lg border backdrop-blur text-xs transition-all cursor-pointer ${
                showSwarms
                  ? 'bg-purple-500/20 text-purple-300 border-purple-500/40 shadow-xs shadow-purple-500/20'
                  : 'bg-slate-900/60 text-slate-400 border-transparent hover:text-white hover:bg-slate-800'
              }`}
              title={`Enjambres Sísmicos: ${showSwarms ? 'Visibles' : 'Ocultos'}`}
            >
              <Radio className={`w-3.5 h-3.5 ${showSwarms ? 'animate-pulse text-purple-300' : ''}`} />
            </button>

            <button
              onClick={() => setShowPlates(!showPlates)}
              className={`p-2 rounded-lg border backdrop-blur text-xs transition-all cursor-pointer ${
                showPlates
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-xs shadow-amber-500/20'
                  : 'bg-slate-900/60 text-slate-400 border-transparent hover:text-white hover:bg-slate-800'
              }`}
              title={`Fallas y Placas Tectónicas: ${showPlates ? 'Visibles' : 'Ocultas'}`}
            >
              <Layers className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setShowHubs(!showHubs)}
              className={`p-2 rounded-lg border backdrop-blur text-xs transition-all cursor-pointer ${
                showHubs
                  ? alertHubsCount > 0
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                    : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-xs shadow-cyan-500/20'
                  : 'bg-slate-900/60 text-slate-400 border-transparent hover:text-white hover:bg-slate-800'
              }`}
              title={`Hubs SuperApp: ${showHubs ? 'Visibles' : 'Ocultos'}`}
            >
              <Building2 className="w-3.5 h-3.5" />
            </button>

            <div className="w-px h-4 bg-slate-800 mx-0.5" />

            <button
              onClick={resetView}
              className="p-2 rounded-lg border border-transparent hover:border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-white text-xs transition-all cursor-pointer"
              title="Restablecer posición inicial del mapa"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Menú Desplegable de Vuelo Táctico */}
          <div id="map2d-flight-dropdown-container" className="relative">
            <button
              onClick={() => setShowFlightDropdown(!showFlightDropdown)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border backdrop-blur-md text-xs font-mono font-medium shadow-xl transition-all cursor-pointer ${
                showFlightDropdown
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                  : 'bg-slate-900/90 text-slate-300 border-slate-800 hover:border-slate-700 hover:bg-slate-800 hover:text-white'
              }`}
              title="Seleccionar preset de vuelo táctico"
            >
              <Navigation className="w-3.5 h-3.5 text-cyan-400" />
              <span>Vuelo: {REGIONAL_PRESETS.find((p) => p.id === selectedPresetId)?.name || 'Global'}</span>
              <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${showFlightDropdown ? 'rotate-180 text-cyan-400' : ''}`} />
            </button>

            {showFlightDropdown && (
              <div className="absolute top-full left-0 mt-1.5 w-44 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-xl p-1 shadow-2xl z-30 font-mono text-xs space-y-0.5 animate-in fade-in slide-in-from-top-1 duration-150">
                {REGIONAL_PRESETS.map((p) => {
                  const isSelected = p.id === selectedPresetId;
                  return (
                    <button
                      key={p.id}
                      onClick={() => {
                        setSelectedPresetId(p.id);
                        mapInstanceRef.current?.flyTo([p.lat, p.lng], p.zoom, { duration: 1.2 });
                        setShowFlightDropdown(false);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg transition-colors flex items-center justify-between cursor-pointer ${
                        isSelected
                          ? 'bg-cyan-500/20 text-cyan-300 font-semibold'
                          : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                      }`}
                    >
                      <span>{p.name}</span>
                      {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Hubs Risk Alert Notification Banner */}
      {showHubs && alertHubsCount > 0 && (
        <div className="absolute bottom-12 left-3 z-[500] flex items-center gap-1.5 bg-rose-500/20 border border-rose-500/40 text-rose-200 px-2.5 py-1 rounded-lg text-[10px] font-mono shadow-md backdrop-blur-md animate-pulse">
          <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
          <span>{alertHubsCount} Hubs SuperApp en radio de impacto</span>
        </div>
      )}

      {/* Cockpit HUD: Botón Desplegable de Escala / Leyenda */}
      <div className="absolute bottom-3 right-3 z-[500] pointer-events-auto flex flex-col items-end gap-1.5">
        {showLegend && (
          <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-xl p-3 text-xs shadow-2xl space-y-2 max-w-[260px] animate-in fade-in slide-in-from-bottom-2 duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
              <div className="flex items-center gap-1.5 font-semibold text-slate-200">
                <Waves className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-[11px] font-mono">Escala Sísmica</span>
              </div>
              <button
                onClick={() => setShowLegend(false)}
                className="text-slate-400 hover:text-white p-0.5 rounded cursor-pointer"
                title="Cerrar escala"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[10px] font-mono">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#f87171] shadow-xs shadow-[#f87171]/50"></span>
                <span className="text-slate-300">≥ 6.0 · Crítico</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#fb923c] shadow-xs shadow-[#fb923c]/50"></span>
                <span className="text-slate-300">4.5 - 6.0</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#fcd34d] shadow-xs shadow-[#fcd34d]/50"></span>
                <span className="text-slate-300">3.0 - 4.5</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#86efac] shadow-xs shadow-[#86efac]/50"></span>
                <span className="text-slate-300">&lt; 3.0</span>
              </div>
            </div>
            <div className="flex items-center justify-between pt-1.5 border-t border-slate-800 text-[9px] font-mono text-slate-400">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px]">🏢</span>
                <span className="text-sky-300/90">Hubs SuperApp</span>
              </div>
              <span>{events.length} Eventos</span>
            </div>
          </div>
        )}

        <button
          onClick={() => setShowLegend(!showLegend)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border backdrop-blur-md text-xs font-mono font-medium shadow-lg transition-all cursor-pointer ${
            showLegend
              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
              : 'bg-slate-900/80 text-slate-300 border-slate-700/80 hover:bg-slate-800 hover:text-white'
          }`}
          title="Ver/Ocultar escala y simbología"
        >
          <Waves className="w-3.5 h-3.5 text-cyan-400" />
          <span>Escala</span>
          {showLegend ? <ChevronDown className="w-3 h-3 text-slate-400" /> : <ChevronUp className="w-3 h-3 text-slate-400" />}
        </button>
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
