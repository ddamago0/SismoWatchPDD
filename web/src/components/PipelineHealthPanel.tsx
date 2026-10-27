import React from 'react';
import { ShieldCheck, Workflow, Clock } from 'lucide-react';
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
        <div className="p-5 bg-[#171211] border border-[#261f1c] rounded-2xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#9b9baa] font-semibold">
              Salud del Ingestor USGS
            </span>
            <span className="w-2 h-2 rounded-full bg-[#86efac] animate-pulse" />
          </div>
          <div className="text-xl font-mono font-bold text-[#f7f7f9]">OPERACIONAL</div>
          <p className="text-[11px] font-mono text-[#9b9baa] mt-1">
            Frecuencia de ciclo: cada 5 minutos vía Airflow
          </p>
        </div>

        <div className="p-5 bg-[#171211] border border-[#261f1c] rounded-2xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#9b9baa] font-semibold">
              Conformidad Pandera
            </span>
            <ShieldCheck className="w-4 h-4 text-[#86efac]" />
          </div>
          <div className="text-xl font-mono font-bold text-[#86efac]">{quality}% Conforme</div>
          <p className="text-[11px] font-mono text-[#9b9baa] mt-1">
            Validaciones bloqueantes de límites y esquemas activas
          </p>
        </div>

        <div className="p-5 bg-[#171211] border border-[#261f1c] rounded-2xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#9b9baa] font-semibold">
              Última Sincronización
            </span>
            <Clock className="w-4 h-4 text-[#d5c4fb]" />
          </div>
          <div className="text-sm font-mono font-bold text-[#f7f7f9] truncate">{latestUpdate}</div>
          <p className="text-[11px] font-mono text-[#9b9baa] mt-1">
            Capa Gold certificada: {certifiedEvents} sismos
          </p>
        </div>
      </div>

      {/* Medallion Pipeline Architecture Flow */}
      <div className="p-6 bg-[#171211] border border-[#261f1c] rounded-2xl">
        <h3 className="text-xs font-mono font-semibold text-[#f7f7f9] uppercase tracking-wider mb-4 pb-2 border-b border-[#261f1c] flex items-center gap-2">
          <Workflow className="w-4 h-4 text-[#d5c4fb]" />
          <span>Resumen de Arquitectura Medallion</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono">
          <div className="p-4 bg-[#120e0d] rounded-xl border border-[#241c19]">
            <div className="flex items-center justify-between mb-1.5">
              <span className="px-2 py-0.5 rounded text-[9px] font-semibold uppercase bg-[#292214] text-[#fde047] border border-[#4a3b1d]/60">
                Bronze (Crudo)
              </span>
              <span className="text-[10px] text-[#86efac] font-medium">Activo</span>
            </div>
            <h4 className="text-xs font-semibold text-[#ececf1] mt-1">raw.usgs_earthquakes_raw</h4>
            <p className="text-[11px] text-[#9b9baa] mt-1 font-sans">
              Almacena el payload GeoJSON original sin transformaciones destructivas para trazabilidad.
            </p>
          </div>

          <div className="p-4 bg-[#120e0d] rounded-xl border border-[#241c19]">
            <div className="flex items-center justify-between mb-1.5">
              <span className="px-2 py-0.5 rounded text-[9px] font-semibold uppercase bg-[#201a18] text-[#ececf1] border border-[#332b27]">
                Silver (Normalizado)
              </span>
              <span className="text-[10px] text-[#86efac] font-medium">Activo</span>
            </div>
            <h4 className="text-xs font-semibold text-[#ececf1] mt-1">staging.earthquakes_staging</h4>
            <p className="text-[11px] text-[#9b9baa] mt-1 font-sans">
              Coordenadas aplanadas, tipos de datos forzados y marcas temporales normalizadas en UTC.
            </p>
          </div>

          <div className="p-4 bg-[#120e0d] rounded-xl border border-[#241c19]">
            <div className="flex items-center justify-between mb-1.5">
              <span className="px-2 py-0.5 rounded text-[9px] font-semibold uppercase bg-[#14231b] text-[#86efac] border border-[#234231]/60">
                Gold (Certificado)
              </span>
              <span className="text-[10px] text-[#86efac] font-medium">Certificado</span>
            </div>
            <h4 className="text-xs font-semibold text-[#ececf1] mt-1">curated.earthquakes_curated</h4>
            <p className="text-[11px] text-[#9b9baa] mt-1 font-sans">
              Hechos sísmicos 100% validados por Pandera, indexados para consultas analíticas de baja latencia.
            </p>
          </div>
        </div>

        <div className="mt-4 p-3 bg-[#120e0d] rounded-xl border border-[#241c19] text-[11px] font-mono text-[#9b9baa] flex items-center justify-between">
          <span>Aislamiento de Calidad: Los registros anómalos son desviados a la cuarentena.</span>
          <span className="text-[#9b9baa] text-[10px]">Detalle de cuarentena accesible por Administrador</span>
        </div>
      </div>
    </div>
  );
};
