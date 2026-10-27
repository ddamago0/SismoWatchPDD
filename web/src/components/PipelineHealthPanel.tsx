import React from 'react';
import { Layers, CheckCircle2, ShieldCheck, Database, Workflow, Activity, Clock } from 'lucide-react';
import { KpiData } from '../types';

interface PipelineHealthPanelProps {
  kpis: KpiData | null;
}

export const PipelineHealthPanel: React.FC<PipelineHealthPanelProps> = ({ kpis }) => {
  const quality = kpis?.quality_score ?? kpis?.data_quality_score ?? 100;
  const certifiedEvents = kpis?.total_events_24h ?? 0;
  const latestUpdate = kpis?.latest_update ? new Date(kpis.latest_update).toLocaleString() : 'En tiempo real';

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 bg-[#0b121e] border border-slate-800 rounded-2xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-bold">
              Salud del Ingestor USGS
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <div className="text-xl font-mono font-black text-white">OPERACIONAL</div>
          <p className="text-[11px] font-mono text-slate-400 mt-1">
            Frecuencia de ciclo: cada 5 minutos vía Airflow
          </p>
        </div>

        <div className="p-5 bg-[#0b121e] border border-slate-800 rounded-2xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-bold">
              Conformidad Pandera
            </span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-mono font-black text-emerald-400">{quality}% Conforme</div>
          <p className="text-[11px] font-mono text-slate-400 mt-1">
            Validaciones bloqueantes de límites y esquemas activas
          </p>
        </div>

        <div className="p-5 bg-[#0b121e] border border-slate-800 rounded-2xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-bold">
              Última Sincronización
            </span>
            <Clock className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-sm font-mono font-bold text-white truncate">{latestUpdate}</div>
          <p className="text-[11px] font-mono text-slate-400 mt-1">
            Capa Gold certificada: {certifiedEvents} sismos
          </p>
        </div>
      </div>

      {/* Medallion Pipeline Architecture Flow */}
      <div className="p-6 bg-[#0b121e] border border-slate-800 rounded-2xl">
        <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider mb-4 pb-2 border-b border-slate-800 flex items-center gap-2">
          <Workflow className="w-4 h-4 text-blue-400" />
          <span>Resumen de Arquitectura Medallion</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono">
          <div className="p-4 bg-[#070b14] rounded-xl border border-slate-800">
            <div className="flex items-center justify-between mb-1.5">
              <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20">
                Bronze (Crudo)
              </span>
              <span className="text-[10px] text-emerald-400 font-bold">Activo</span>
            </div>
            <h4 className="text-xs font-bold text-slate-200 mt-1">raw.usgs_earthquakes_raw</h4>
            <p className="text-[11px] text-slate-400 mt-1 font-sans">
              Almacena el payload GeoJSON original sin transformaciones destructivas para trazabilidad.
            </p>
          </div>

          <div className="p-4 bg-[#070b14] rounded-xl border border-slate-800">
            <div className="flex items-center justify-between mb-1.5">
              <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-slate-500/10 text-slate-300 border border-slate-500/20">
                Silver (Normalizado)
              </span>
              <span className="text-[10px] text-emerald-400 font-bold">Activo</span>
            </div>
            <h4 className="text-xs font-bold text-slate-200 mt-1">staging.earthquakes_staging</h4>
            <p className="text-[11px] text-slate-400 mt-1 font-sans">
              Coordenadas aplanadas, tipos de datos forzados y marcas temporales normalizadas en UTC.
            </p>
          </div>

          <div className="p-4 bg-[#070b14] rounded-xl border border-slate-800">
            <div className="flex items-center justify-between mb-1.5">
              <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Gold (Certificado)
              </span>
              <span className="text-[10px] text-emerald-400 font-bold">Certificado</span>
            </div>
            <h4 className="text-xs font-bold text-slate-200 mt-1">curated.earthquakes_curated</h4>
            <p className="text-[11px] text-slate-400 mt-1 font-sans">
              Hechos sísmicos 100% validados por Pandera, indexados para consultas analíticas de baja latencia.
            </p>
          </div>
        </div>

        <div className="mt-4 p-3 bg-slate-900/60 rounded-xl border border-slate-800 text-[11px] font-mono text-slate-400 flex items-center justify-between">
          <span>Aislamiento de Calidad: Los registros anómalos son desviados a la cuarentena.</span>
          <span className="text-slate-500 text-[10px]">Detalle de cuarentena accesible por Administrador</span>
        </div>
      </div>
    </div>
  );
};
