import React, { useEffect, useRef, useState, useMemo } from 'react';
import Globe, { GlobeMethods } from 'react-globe.gl';
import { Waves, Compass, RotateCcw, Radio, Sparkles, Layers, Navigation, Building2, ShieldAlert, ChevronDown, ChevronUp, X } from 'lucide-react';
import { EarthquakeEvent, SeismicAnomaly, SuperAppHub } from '../types';
import { computeHubImpacts } from '../data/superAppHubs';

interface SeismicGlobe3DProps {
  events: EarthquakeEvent[];
  anomalies?: SeismicAnomaly[];
  selectedEvent?: EarthquakeEvent | null;
  onSelectEvent?: (event: EarthquakeEvent) => void;
}

/**
 * Lienzo dinámico de campo estelar con estrellas titilantes y estrellas fugaces animadas.
 * Réplica idéntica del modelo 3D de alta fidelidad visual.
 */
const CosmicStarfield: React.FC<{ width: number; height: number }> = ({ width, height }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    // Generar estrellas fijas con titileo estocástico
    const starCount = 200;
    const stars: Array<{
      x: number;
      y: number;
      radius: number;
      alpha: number;
      baseAlpha: number;
      speed: number;
    }> = [];

    for (let i = 0; i < starCount; i++) {
      const baseAlpha = Math.random() * 0.7 + 0.2;
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 1.3 + 0.4,
        alpha: baseAlpha,
        baseAlpha,
        speed: Math.random() * 0.02 + 0.005,
      });
    }

    // Estrellas fugaces periódicas (Shooting Stars)
    interface ShootingStar {
      x: number;
      y: number;
      length: number;
      speed: number;
      angle: number;
      opacity: number;
      life: number;
      maxLife: number;
    }
    const shootingStars: ShootingStar[] = [];

    let lastSpawnTime = Date.now();
    let nextSpawnDelay = Math.random() * 2500 + 1500;

    const spawnShootingStar = () => {
      const angle = (Math.random() * 20 + 30) * (Math.PI / 180);
      shootingStars.push({
        x: Math.random() * width * 0.85,
        y: Math.random() * height * 0.35,
        length: Math.random() * 90 + 65,
        speed: Math.random() * 6 + 10,
        angle,
        opacity: 1,
        life: 0,
        maxLife: Math.random() * 35 + 30,
      });
    };

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Gradiente radial de espacio profundo
      const bgGrad = ctx.createRadialGradient(
        width * 0.5,
        height * 0.5,
        80,
        width * 0.5,
        height * 0.5,
        Math.max(width, height)
      );
      bgGrad.addColorStop(0, '#030816');
      bgGrad.addColorStop(0.6, '#020510');
      bgGrad.addColorStop(1, '#000206');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Dibujar estrellas titilantes
      for (const s of stars) {
        s.alpha = s.baseAlpha + Math.sin(Date.now() * s.speed) * 0.25;
        const finalAlpha = Math.max(0.15, Math.min(1, s.alpha));
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${finalAlpha})`;
        ctx.shadowBlur = s.radius > 1.1 ? 4 : 0;
        ctx.shadowColor = '#38bdf8';
        ctx.fill();
      }
      ctx.shadowBlur = 0;

      // Generar nuevas estrellas fugaces
      const now = Date.now();
      if (now - lastSpawnTime > nextSpawnDelay) {
        spawnShootingStar();
        lastSpawnTime = now;
        nextSpawnDelay = Math.random() * 3500 + 2500;
      }

      // Actualizar y renderizar estrellas fugaces
      for (let i = shootingStars.length - 1; i >= 0; i--) {
        const ss = shootingStars[i];
        ss.life++;
        const tailX = ss.x - Math.cos(ss.angle) * ss.length;
        const tailY = ss.y - Math.sin(ss.angle) * ss.length;

        const currentOpacity = Math.max(0, 1 - ss.life / ss.maxLife);

        const grad = ctx.createLinearGradient(tailX, tailY, ss.x, ss.y);
        grad.addColorStop(0, 'rgba(56, 189, 248, 0)');
        grad.addColorStop(0.7, `rgba(56, 189, 248, ${currentOpacity * 0.6})`);
        grad.addColorStop(1, `rgba(255, 255, 255, ${currentOpacity})`);

        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(ss.x, ss.y);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.6;
        ctx.lineCap = 'round';
        ctx.stroke();

        // Núcleo brillante
        ctx.beginPath();
        ctx.arc(ss.x, ss.y, 1.2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${currentOpacity})`;
        ctx.fill();

        ss.x += Math.cos(ss.angle) * ss.speed;
        ss.y += Math.sin(ss.angle) * ss.speed;

        if (ss.life >= ss.maxLife || ss.x > width + 100 || ss.y > height + 100) {
          shootingStars.splice(i, 1);
        }
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="absolute inset-0 pointer-events-none z-0"
    />
  );
};

// Presets de vuelo de cámara orbital a regiones sismotectónicas clave
const REGIONAL_PRESETS = [
  { id: 'global', name: 'Global', lat: 20.0, lng: 0.0, altitude: 2.5 },
  { id: 'latam', name: 'Andes / LatAm', lat: -15.0, lng: -75.0, altitude: 1.8 },
  { id: 'pacific', name: 'Cinturón Pacífico', lat: 10.0, lng: 165.0, altitude: 2.5 },
  { id: 'japan', name: 'Japón / Asia', lat: 36.0, lng: 139.0, altitude: 1.6 },
  { id: 'sanandreas', name: 'San Andrés / USA', lat: 36.5, lng: -120.0, altitude: 1.7 },
  { id: 'mediterranean', name: 'Mediterráneo', lat: 37.0, lng: 20.0, altitude: 1.8 },
];

export const SeismicGlobe3D: React.FC<SeismicGlobe3DProps> = ({
  events,
  anomalies = [],
  selectedEvent,
  onSelectEvent,
}) => {
  const globeRef = useRef<GlobeMethods>();
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [isRotating, setIsRotating] = useState<boolean>(true);
  const [showBeacons, setShowBeacons] = useState<boolean>(false);
  const [showPlates, setShowPlates] = useState<boolean>(true);
  const [showHubs, setShowHubs] = useState<boolean>(true);
  const [showLegend, setShowLegend] = useState<boolean>(false);
  const [showFlightDropdown, setShowFlightDropdown] = useState<boolean>(false);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('global');
  const [platesGeoJson, setPlatesGeoJson] = useState<any>(null);

  // Cerrar dropdown de vuelo al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('#flight-dropdown-container')) {
        setShowFlightDropdown(false);
      }
    };
    if (showFlightDropdown) {
      document.addEventListener('click', handleClickOutside);
    }
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showFlightDropdown]);

  // Evaluación de impacto sísmico en Hubs Logísticos de SuperApp
  const computedHubs = useMemo(() => {
    return computeHubImpacts(events);
  }, [events]);

  const alertHubsCount = useMemo(() => {
    return computedHubs.filter((h) => h.status !== 'OPERATIVO').length;
  }, [computedHubs]);

  // Cargar modelo de fallas tectónicas globales PB2002
  useEffect(() => {
    fetch('/tectonic-plates.json')
      .then((res) => {
        if (!res.ok) throw new Error('Fallo al cargar fallas tectónicas');
        return res.json();
      })
      .then((data) => setPlatesGeoJson(data))
      .catch((err) => console.warn('Capa de placas tectónicas no disponible:', err));
  }, []);

  const platesPaths = useMemo(() => {
    if (!platesGeoJson || !platesGeoJson.features) return [];
    return platesGeoJson.features.map((feat: any) => {
      const isSubduction = String(feat.properties?.Type || '').toLowerCase().includes('subduction');
      return {
        name: feat.properties?.Name || 'Falla Tectónica',
        type: feat.properties?.Type || 'Límite de Placa',
        coords: (feat.geometry?.coordinates || []).map((c: [number, number]) => [c[1], c[0], 0.003]),
        color: isSubduction ? 'rgba(244, 63, 94, 0.75)' : 'rgba(245, 158, 11, 0.70)',
      };
    });
  }, [platesGeoJson]);

  // Redimensionamiento responsivo del contenedor WebGL
  useEffect(() => {
    if (!containerRef.current) return;

    const handleResize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight || 560,
        });
      }
    };

    handleResize();
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(containerRef.current);

    return () => resizeObserver.disconnect();
  }, []);

  // Control de auto-rotación y amortiguamiento
  useEffect(() => {
    if (!globeRef.current) return;
    const controls = globeRef.current.controls();
    if (controls) {
      controls.autoRotate = isRotating;
      controls.autoRotateSpeed = 0.6;
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
    }
  }, [isRotating]);

  // Órbita fluida de la cámara al seleccionar un sismo
  useEffect(() => {
    if (selectedEvent && globeRef.current) {
      setIsRotating(false);
      globeRef.current.pointOfView(
        {
          lat: selectedEvent.latitude,
          lng: selectedEvent.longitude,
          altitude: 1.6,
        },
        1200
      );
    }
  }, [selectedEvent]);

  const getMarkerColor = (mag: number): string => {
    if (mag >= 5.0) return '#ff0055'; // Neon Hyper Red (Crítico)
    if (mag >= 4.0) return '#ff9900'; // Neon Electric Amber
    if (mag >= 2.5) return '#00ff66'; // Neon Matrix Green
    return '#00d4ff'; // Neon Laser Cyan (< 2.5)
  };

  const getRingColor = (mag: number): string => {
    if (mag >= 5.0) return 'rgba(255, 0, 85, 0.75)';
    if (mag >= 4.0) return 'rgba(255, 153, 0, 0.65)';
    if (mag >= 2.5) return 'rgba(0, 255, 102, 0.50)';
    return 'rgba(0, 212, 255, 0.40)';
  };

  // Ondas concéntricas de pulso sísmico (PGA Impact Wave)
  const ringsData = useMemo(() => {
    const list: any[] = events.map((ev) => {
      const mag = Number(ev.mag || 0);
      const estRadiusKm = Math.max(10, Math.pow(10, 0.43 * mag + 0.5));
      return {
        lat: ev.latitude,
        lng: ev.longitude,
        color: getRingColor(mag),
        maxR: Math.max(2.0, Math.min(10.0, estRadiusKm / 18)),
        propagationSpeed: Math.max(1.0, mag * 0.4),
        repeatPeriod: 1200,
        isTargetPulse: false,
      };
    });

    // Pulso táctico de advertencia en Hubs bajo alerta o evacuación
    if (showHubs) {
      computedHubs.forEach((hub) => {
        if (hub.status === 'EVACUACIÓN_INMEDIATA') {
          list.push({
            lat: hub.latitude,
            lng: hub.longitude,
            color: 'rgba(239, 68, 68, 0.95)',
            maxR: 8.0,
            propagationSpeed: 3.0,
            repeatPeriod: 800,
            isTargetPulse: false,
          });
        } else if (hub.status === 'ALERTA_PRECAUCIÓN') {
          list.push({
            lat: hub.latitude,
            lng: hub.longitude,
            color: 'rgba(245, 158, 11, 0.85)',
            maxR: 5.5,
            propagationSpeed: 2.0,
            repeatPeriod: 1300,
            isTargetPulse: false,
          });
        }
      });
    }

    // Pulso táctico de focalización si hay sismo seleccionado
    if (selectedEvent) {
      list.push({
        lat: selectedEvent.latitude,
        lng: selectedEvent.longitude,
        color: 'rgba(0, 245, 255, 0.95)',
        maxR: 15.0,
        propagationSpeed: 4.5,
        repeatPeriod: 600,
        isTargetPulse: true,
      });
    }

    return list;
  }, [events, selectedEvent, showHubs, computedHubs]);

  const resetView = () => {
    if (globeRef.current) {
      globeRef.current.pointOfView({ lat: 20, lng: 0, altitude: 2.5 }, 1000);
      setIsRotating(true);
    }
  };

  const flyToRegion = (preset: typeof REGIONAL_PRESETS[0]) => {
    if (globeRef.current) {
      setIsRotating(false);
      globeRef.current.pointOfView(
        { lat: preset.lat, lng: preset.lng, altitude: preset.altitude },
        1400
      );
    }
  };

  const handlePointClick = (event: any) => {
    const matched = events.find((e) => e.id === event.id || e.id === event.event_id);
    if (matched && onSelectEvent) {
      onSelectEvent(matched);
    }
  };

  const renderTooltip = (ev: EarthquakeEvent): string => {
    const mag = Number(ev.mag || 0);
    const color = getMarkerColor(mag);
    const magClass = mag >= 6.0 ? 'Mayor' : mag >= 4.5 ? 'Moderado' : mag >= 3.0 ? 'Menor' : 'Micro';
    const estRadiusKm = Math.round(Math.max(15, Math.pow(10, 0.43 * mag + 0.5)));

    return `
      <div style="background: rgba(15, 23, 42, 0.95); border: 1px solid #334155; border-radius: 8px; padding: 10px 14px; font-family: sans-serif; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.5); min-width: 230px; color: #f8fafc;">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #334155; padding-bottom: 6px; margin-bottom: 6px;">
          <span style="font-family: monospace; font-size: 11px; font-weight: bold; color: #38bdf8;">${ev.id}</span>
          <span style="background: ${color}; color: #0f172a; font-weight: 800; font-size: 11px; padding: 2px 6px; border-radius: 4px;">
            M ${mag.toFixed(1)} (${magClass})
          </span>
        </div>
        <div style="font-size: 12px; font-weight: 600; margin-bottom: 4px; color: #e2e8f0;">${ev.place || ev.title}</div>
        <div style="font-size: 11px; color: #94a3b8; display: grid; grid-template-columns: 1fr 1fr; gap: 4px;">
          <div>Profundidad: <b style="color: #cbd5e1;">${ev.depth_km !== undefined ? `${Number(ev.depth_km).toFixed(1)} km` : '--'}</b></div>
          <div>Radio PGA: <b style="color: #38bdf8;">${estRadiusKm} km</b></div>
        </div>
        ${
          ev.tsunami === 1
            ? '<div style="margin-top: 6px; background: rgba(239, 68, 68, 0.2); border: 1px solid #ef4444; color: #fca5a5; font-size: 10px; font-weight: bold; padding: 2px 6px; border-radius: 4px; text-align: center;">⚠️ ALERTA DE TSUNAMI EMITIDA</div>'
            : ''
        }
      </div>
    `;
  };

  const renderHubTooltip = (hub: SuperAppHub): string => {
    const isEvac = hub.status === 'EVACUACIÓN_INMEDIATA';
    const isWarn = hub.status === 'ALERTA_PRECAUCIÓN';
    const statusColor = isEvac ? '#ef4444' : isWarn ? '#f59e0b' : '#10b981';
    const statusBg = isEvac ? 'rgba(239, 68, 68, 0.2)' : isWarn ? 'rgba(245, 158, 11, 0.2)' : 'rgba(16, 185, 129, 0.2)';
    const statusBorder = isEvac ? '#ef4444' : isWarn ? '#f59e0b' : '#10b981';
    const statusText = isEvac ? 'EVACUACIÓN INMEDIATA' : isWarn ? 'ALERTA PRECAUCIÓN' : 'OPERATIVO NORMAL';

    return `
      <div style="background: rgba(15, 23, 42, 0.96); border: 1px solid ${statusBorder}; border-radius: 8px; padding: 12px 14px; font-family: sans-serif; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.6); min-width: 250px; color: #f8fafc;">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #334155; padding-bottom: 6px; margin-bottom: 8px;">
          <span style="font-family: monospace; font-size: 11px; font-weight: bold; color: #38bdf8;">🏢 HUB SUPERAPP</span>
          <span style="background: ${statusBg}; border: 1px solid ${statusBorder}; color: ${statusColor}; font-weight: 800; font-size: 10px; padding: 2px 6px; border-radius: 4px;">
            ${statusText}
          </span>
        </div>
        <div style="font-size: 13px; font-weight: 700; color: #ffffff; margin-bottom: 2px;">${hub.name}</div>
        <div style="font-size: 11px; color: #94a3b8; margin-bottom: 8px;">${hub.city}, ${hub.country}</div>
        <div style="font-size: 11px; color: #cbd5e1; display: grid; grid-template-columns: 1fr; gap: 4px; background: rgba(30, 41, 59, 0.5); padding: 6px 8px; border-radius: 6px;">
          <div>🛵 Flota Activa: <b style="color: #38bdf8;">${hub.activeCouriers} mensajeros</b></div>
          <div>📍 Sismo más cercano: <b style="color: ${hub.nearestEventDistanceKm !== undefined && hub.nearestEventDistanceKm < 150 ? '#f59e0b' : '#94a3b8'};">${hub.nearestEventDistanceKm !== undefined ? `${hub.nearestEventDistanceKm} km` : 'Sin sismos cercanos'}</b></div>
          ${hub.triggerEventMag ? `<div style="color: #f87171;">⚠️ Activado por: <b>M ${hub.triggerEventMag.toFixed(1)}</b> (${hub.triggerEventPlace || 'Epicentro'})</div>` : ''}
        </div>
        <div style="margin-top: 8px; font-size: 10px; color: #94a3b8; font-style: italic;">
          ${isEvac ? '🚨 Protocolo: Suspender asignación de órdenes y evacuar personal.' : isWarn ? '⚠️ Protocolo: Notificar a repartidores en ruta y verificar inventario.' : '✅ Operación regular sin riesgos geofísicos inminentes.'}
        </div>
      </div>
    `;
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[540px] rounded-xl overflow-hidden bg-slate-950 border border-[#2d2421] shadow-2xl select-none"
    >
      {/* Fondo cósmico animado con estrellas fugaces */}
      <CosmicStarfield width={dimensions.width} height={dimensions.height} />

      {/* Globo 3D WebGL interactivo */}
      <Globe
        ref={globeRef}
        width={dimensions.width}
        height={dimensions.height}
        backgroundColor="rgba(0,0,0,0)"
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
        bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
        showAtmosphere={true}
        atmosphereColor="#38bdf8"
        atmosphereAltitude={0.16}
        // Nodos epicentrales + Beacons láser tridimensionales
        pointsData={events}
        pointLat={(d: any) => d.latitude}
        pointLng={(d: any) => d.longitude}
        pointAltitude={(d: any) => {
          return showBeacons ? Math.max(0.08, (Number(d.mag || 0) / 10) * 0.38) : 0;
        }}
        pointRadius={(d: any) => {
          if (d.id === selectedEvent?.id) return 0.55;
          return showBeacons ? 0.12 : Math.max(0.35, (Number(d.mag || 0) / 10) * 0.8);
        }}
        pointColor={(d: any) =>
          d.id === selectedEvent?.id
            ? '#00f5ff'
            : getMarkerColor(Number(d.mag || 0))
        }
        pointLabel={(d: any) => renderTooltip(d)}
        onPointClick={handlePointClick}
        // Ondas concéntricas de pulso sísmico
        ringsData={ringsData}
        ringLat={(d: any) => d.lat}
        ringLng={(d: any) => d.lng}
        ringColor={(d: any) => () => d.color}
        ringMaxRadius={(d: any) => d.maxR}
        ringPropagationSpeed={(d: any) => d.propagationSpeed}
        ringRepeatPeriod={(d: any) => d.repeatPeriod}
        // Capa de Placas Tectónicas Globales (Cinturón de Fuego y Fallas Mayores PB2002)
        pathsData={showPlates ? platesPaths : []}
        pathPoints={(d: any) => d.coords}
        pathColor={(d: any) => d.color}
        pathStroke={1.4}
        pathDashLength={0.15}
        pathDashGap={0.03}
        pathDashAnimateTime={12000}
        pathLabel={(d: any) => `<div style="background: rgba(15,23,42,0.95); border: 1px solid #b45309; padding: 4px 8px; border-radius: 4px; font-size: 11px; color: #fef3c7; font-family: monospace;">Falla: ${d.name} (${d.type})</div>`}
        // Hubs Logísticos de SuperApp
        labelsData={showHubs ? computedHubs : []}
        labelLat={(d: any) => d.latitude}
        labelLng={(d: any) => d.longitude}
        labelText={(d: any) => `${d.status === 'EVACUACIÓN_INMEDIATA' ? '🚨' : d.status === 'ALERTA_PRECAUCIÓN' ? '⚠️' : '🏢'} ${d.city}`}
        labelSize={1.15}
        labelDotRadius={(d: any) => (d.status === 'EVACUACIÓN_INMEDIATA' ? 0.7 : 0.4)}
        labelColor={(d: any) =>
          d.status === 'EVACUACIÓN_INMEDIATA'
            ? 'rgba(239, 68, 68, 0.95)'
            : d.status === 'ALERTA_PRECAUCIÓN'
            ? 'rgba(245, 158, 11, 0.95)'
            : 'rgba(56, 189, 248, 0.90)'
        }
        labelAltitude={0.015}
        labelLabel={(d: any) => renderHubTooltip(d)}
        onLabelClick={(d: any) => {
          if (globeRef.current) {
            setIsRotating(false);
            globeRef.current.pointOfView({ lat: d.latitude, lng: d.longitude, altitude: 1.4 }, 1000);
          }
        }}
      />

      {/* Cockpit HUD: Controles Superiores Compactos (Solo Iconos + Desplegable de Vuelo) */}
      <div className="absolute top-3 left-3 right-3 z-20 flex items-center justify-between pointer-events-none">
        {/* Controles y Vuelo en fila única */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Grupo de Iconos de Herramientas */}
          <div className="flex items-center gap-1 bg-slate-900/90 backdrop-blur-md p-1 rounded-xl border border-slate-800 shadow-xl">
            <button
              onClick={() => setIsRotating(!isRotating)}
              className={`p-2 rounded-lg border backdrop-blur text-xs transition-all cursor-pointer ${
                isRotating
                  ? 'bg-sky-500/20 text-sky-300 border-sky-500/40 shadow-xs shadow-sky-500/20'
                  : 'bg-slate-900/60 text-slate-400 border-transparent hover:text-white hover:bg-slate-800'
              }`}
              title={`Auto-Rotación: ${isRotating ? 'Activada' : 'Desactivada'}`}
            >
              <Compass className={`w-3.5 h-3.5 ${isRotating ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={() => setShowPlates(!showPlates)}
              className={`p-2 rounded-lg border backdrop-blur text-xs transition-all cursor-pointer ${
                showPlates
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-xs shadow-amber-500/20'
                  : 'bg-slate-900/60 text-slate-400 border-transparent hover:text-white hover:bg-slate-800'
              }`}
              title={`Fallas y Placas Tectónicas (PB2002): ${showPlates ? 'Visibles' : 'Ocultas'}`}
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
              title={`Hubs SuperApp (10 Dark Stores): ${showHubs ? 'Visibles' : 'Ocultos'}`}
            >
              <Building2 className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setShowBeacons(!showBeacons)}
              className={`p-2 rounded-lg border backdrop-blur text-xs transition-all cursor-pointer ${
                showBeacons
                  ? 'bg-purple-500/20 text-purple-300 border-purple-500/40 shadow-xs shadow-purple-500/20'
                  : 'bg-slate-900/60 text-slate-400 border-transparent hover:text-white hover:bg-slate-800'
              }`}
              title={`Balizas Láser 3D: ${showBeacons ? 'Activadas' : 'Desactivadas'}`}
            >
              <Sparkles className="w-3.5 h-3.5" />
            </button>

            <div className="w-px h-4 bg-slate-800 mx-0.5" />

            <button
              onClick={resetView}
              className="p-2 rounded-lg border border-transparent hover:border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-white text-xs transition-all cursor-pointer"
              title="Restablecer posición inicial de la cámara"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Menú Desplegable de Vuelo Orbital */}
          <div id="flight-dropdown-container" className="relative">
            <button
              onClick={() => setShowFlightDropdown(!showFlightDropdown)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border backdrop-blur-md text-xs font-mono font-medium shadow-xl transition-all cursor-pointer ${
                showFlightDropdown
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                  : 'bg-slate-900/90 text-slate-300 border-slate-800 hover:border-slate-700 hover:bg-slate-800 hover:text-white'
              }`}
              title="Seleccionar preset de vuelo orbital"
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
                        flyToRegion(p);
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

      {/* Alerta de Hubs en Riesgo Sísmico */}
      {showHubs && alertHubsCount > 0 && (
        <div className="absolute top-16 left-4 z-20 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs font-semibold backdrop-blur shadow-xl animate-pulse">
          <ShieldAlert className="w-4 h-4 text-rose-400" />
          <span>{alertHubsCount} Hub(s) SuperApp en radio de impacto</span>
        </div>
      )}

      {/* Indicador de anomalías activas */}
      {anomalies.length > 0 && (
        <div className="absolute top-16 right-4 z-20 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-medium backdrop-blur">
          <Radio className="w-3.5 h-3.5 animate-pulse text-amber-400" />
          <span>{anomalies.length} Enjambre(s) detectado(s)</span>
        </div>
      )}

      {/* Cockpit HUD: Botón Desplegable de Leyenda */}
      <div className="absolute bottom-4 left-4 z-20 pointer-events-auto flex flex-col items-start gap-1.5">
        {showLegend && (
          <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-xl p-3 text-xs shadow-2xl space-y-2 max-w-[280px] animate-in fade-in slide-in-from-bottom-2 duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
              <div className="flex items-center gap-1.5 font-semibold text-slate-200">
                <Waves className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-[11px]">Intensidad Sísmica & Logística</span>
              </div>
              <button
                onClick={() => setShowLegend(false)}
                className="text-slate-400 hover:text-white p-0.5 rounded cursor-pointer"
                title="Cerrar leyenda"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px] font-mono">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#ff0055] shadow-xs shadow-[#ff0055]/50"></span>
                <span className="text-slate-300">M ≥ 5.0 (Crítico)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#ff9900] shadow-xs shadow-[#ff9900]/50"></span>
                <span className="text-slate-300">M 4.0 - 4.9</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#00ff66] shadow-xs shadow-[#00ff66]/50"></span>
                <span className="text-slate-300">M 2.5 - 3.9</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#00d4ff] shadow-xs shadow-[#00d4ff]/50"></span>
                <span className="text-slate-300">M &lt; 2.5</span>
              </div>
            </div>
            <div className="flex flex-col gap-1 pt-1.5 border-t border-slate-800 text-[9px] font-mono">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-0.5 bg-[#f59e0b] rounded-full inline-block"></span>
                  <span className="text-amber-300/90">Fallas Tectónicas</span>
                </div>
                <span className="text-slate-500">◎ Clic focaliza</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px]">🏢</span>
                <span className="text-sky-300/90">Hubs SuperApp (10)</span>
              </div>
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
          title="Ver/Ocultar simbología y leyenda"
        >
          <Waves className="w-3.5 h-3.5 text-cyan-400" />
          <span>Leyenda</span>
          {showLegend ? <ChevronDown className="w-3 h-3 text-slate-400" /> : <ChevronUp className="w-3 h-3 text-slate-400" />}
        </button>
      </div>
    </div>
  );
};
