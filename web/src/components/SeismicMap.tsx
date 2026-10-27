import React from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import { EarthquakeEvent } from '../types';
import { ExternalLink, Waves, AlertTriangle } from 'lucide-react';

interface SeismicMapProps {
  events: EarthquakeEvent[];
}

function getMagnitudeColor(mag: number): string {
  if (mag < 3.0) return '#10b981'; // Verde
  if (mag < 4.5) return '#eab308'; // Amarillo
  if (mag < 6.0) return '#f97316'; // Naranja
  return '#ef4444'; // Rojo (Energía alta)
}

function getMagnitudeRadius(mag: number): number {
  if (mag <= 0) return 4;
  return Math.max(4, Math.min(22, mag * 3));
}

export const SeismicMap: React.FC<SeismicMapProps> = ({ events }) => {
  // Center of map defaults to World center (0, 0) or average of events
  const defaultCenter: [number, number] = [20, 0];
  const defaultZoom = 2;

  return (
    <div className="relative w-full h-[450px] rounded-xl overflow-hidden border border-slate-800 bg-slate-950 shadow-md">
      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        style={{ width: '100%', height: '100%', background: '#090d16' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a> | Data: USGS'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />

        {events.map((evt) => {
          const color = getMagnitudeColor(evt.mag);
          const radius = getMagnitudeRadius(evt.mag);

          return (
            <CircleMarker
              key={evt.id}
              center={[evt.latitude, evt.longitude]}
              radius={radius}
              pathOptions={{
                color: color,
                fillColor: color,
                fillOpacity: 0.65,
                weight: 1.5,
              }}
            >
              <Popup className="sismowatch-popup">
                <div className="p-1 min-w-[200px] text-slate-900">
                  <div className="flex items-center justify-between border-b pb-1 mb-2">
                    <span
                      className="px-2 py-0.5 rounded text-white text-xs font-bold"
                      style={{ backgroundColor: color }}
                    >
                      {evt.mag.toFixed(1)} Mw
                    </span>
                    {evt.tsunami === 1 && (
                      <span className="flex items-center gap-1 text-[11px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                        <Waves className="w-3 h-3" /> Tsunami
                      </span>
                    )}
                  </div>

                  <h4 className="font-semibold text-xs text-slate-800 mb-1 leading-snug">
                    {evt.place || 'Ubicación sin registrar'}
                  </h4>

                  <div className="space-y-0.5 text-[11px] text-slate-600">
                    <div>
                      <span className="font-medium text-slate-700">Profundidad:</span> {evt.depth_km} km
                    </div>
                    <div>
                      <span className="font-medium text-slate-700">Fecha/Hora:</span>{' '}
                      {new Date(evt.time).toLocaleString()}
                    </div>
                    <div>
                      <span className="font-medium text-slate-700">Coordenadas:</span>{' '}
                      {evt.latitude.toFixed(2)}°, {evt.longitude.toFixed(2)}°
                    </div>
                  </div>

                  {evt.url && (
                    <a
                      href={evt.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2.5 inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800"
                    >
                      <span>Ver ficha oficial USGS</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>

      {/* Legend Overlay */}
      <div className="absolute bottom-3 right-3 z-[1000] bg-slate-900/90 backdrop-blur-sm border border-slate-800 rounded-lg p-2.5 shadow-lg text-[10px] text-slate-300">
        <div className="font-semibold text-white mb-1.5 uppercase tracking-wider">Escala Magnitud</div>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
            <span>&lt; 3.0 (Leve)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
            <span>3.0 – 4.5 (Moderado)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-orange-500"></span>
            <span>4.5 – 6.0 (Fuerte)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-rose-500"></span>
            <span>≥ 6.0 (Alta Energía)</span>
          </div>
        </div>
      </div>
    </div>
  );
};

