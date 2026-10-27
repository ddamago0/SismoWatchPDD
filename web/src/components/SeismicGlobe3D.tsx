import React, { useEffect, useRef, useState, useMemo } from 'react';
import Globe, { GlobeMethods } from 'react-globe.gl';
import { EarthquakeEvent, SeismicAnomaly } from '../types';
import { Waves, Compass, RotateCcw, Radio, Sparkles, Layers } from 'lucide-react';

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
  const [platesGeoJson, setPlatesGeoJson] = useState<any>(null);

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
  }, [events, selectedEvent]);

  const resetView = () => {
    if (globeRef.current) {
      globeRef.current.pointOfView({ lat: 20, lng: 0, altitude: 2.5 }, 1000);
      setIsRotating(true);
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

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[560px] rounded-xl overflow-hidden bg-slate-950 border border-[#2d2421] shadow-2xl select-none"
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
        labelsData={[]}
      />

      {/* Cockpit HUD: Controles Superiores */}
      <div className="absolute top-4 left-4 z-20 flex flex-wrap items-center gap-2">
        <button
          onClick={() => setIsRotating(!isRotating)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border backdrop-blur text-xs font-medium shadow-lg transition-colors cursor-pointer ${
            isRotating
              ? 'bg-sky-500/20 text-sky-300 border-sky-500/30'
              : 'bg-slate-900/80 text-slate-400 border-slate-700/80 hover:text-white'
          }`}
          title="Alternar rotación automática"
        >
          <Compass className={`w-3.5 h-3.5 ${isRotating ? 'animate-spin' : ''}`} />
          <span>{isRotating ? 'Auto-Rotación: ON' : 'Auto-Rotación: OFF'}</span>
        </button>

        <button
          onClick={() => setShowPlates(!showPlates)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border backdrop-blur text-xs font-medium shadow-lg transition-colors cursor-pointer ${
            showPlates
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
              : 'bg-slate-900/80 text-slate-400 border-slate-700/80 hover:text-white'
          }`}
          title="Alternar visualización de fallas y placas tectónicas (PB2002)"
        >
          <Layers className="w-3.5 h-3.5" />
          <span>{showPlates ? 'Placas Tectónicas: ON' : 'Placas Tectónicas: OFF'}</span>
        </button>

        <button
          onClick={() => setShowBeacons(!showBeacons)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border backdrop-blur text-xs font-medium shadow-lg transition-colors cursor-pointer ${
            showBeacons
              ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
              : 'bg-slate-900/80 text-slate-400 border-slate-700/80 hover:text-white'
          }`}
          title="Alternar balizas láser verticales 3D"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>{showBeacons ? 'Balizas 3D: ON' : 'Balizas 3D: OFF'}</span>
        </button>

        <button
          onClick={resetView}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-700/80 bg-slate-900/80 hover:bg-slate-800 text-slate-300 text-xs font-medium shadow-lg transition-colors cursor-pointer"
          title="Restablecer posición inicial de la cámara"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset</span>
        </button>
      </div>

      {/* Indicador de anomalías activas */}
      {anomalies.length > 0 && (
        <div className="absolute top-4 right-4 z-20 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-medium backdrop-blur">
          <Radio className="w-3.5 h-3.5 animate-pulse text-amber-400" />
          <span>{anomalies.length} Enjambre(s) detectado(s)</span>
        </div>
      )}

      {/* Cockpit HUD: Leyenda de Intensidades y Magnitudes */}
      <div className="absolute bottom-4 left-4 z-20 bg-slate-900/90 backdrop-blur border border-slate-800 rounded-xl p-3 text-xs shadow-2xl space-y-2 pointer-events-auto">
        <div className="flex items-center gap-1.5 font-semibold text-slate-200 border-b border-slate-800 pb-1.5">
          <Waves className="w-4 h-4 text-cyan-400" />
          <span>Intensidad Sísmica & Magnitudes (Globo 3D)</span>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ff0055] shadow-sm shadow-[#ff0055]/50"></span>
            <span className="text-slate-300">M ≥ 5.0 (Crítico)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ff9900] shadow-sm shadow-[#ff9900]/50"></span>
            <span className="text-slate-300">M 4.0 - 4.9</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#00ff66] shadow-sm shadow-[#00ff66]/50"></span>
            <span className="text-slate-300">M 2.5 - 3.9</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#00d4ff] shadow-sm shadow-[#00d4ff]/50"></span>
            <span className="text-slate-300">M &lt; 2.5</span>
          </div>
        </div>
        <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-slate-800 text-[10px]">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-[#f59e0b] rounded-full inline-block"></span>
            <span className="text-amber-300/90 font-mono">Fallas Tectónicas (PB2002)</span>
          </div>
          <span className="text-slate-500 font-mono">◎ Clic focaliza 3D</span>
        </div>
      </div>
    </div>
  );
};
