import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Database, GitCommit, CheckCircle2, AlertOctagon, ArrowRight, Shield, Layers, RefreshCw } from 'lucide-react';
import { LoadingState, ErrorState } from './States';

export const LineagePanel: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLineage = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getLineage();
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Error al cargar el linaje de datos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLineage();
  }, []);

  if (loading) {
    return <LoadingState message="Reconstruyendo grafo de linaje y conciliación Medallion..." />;
  }

  if (error || !data) {
    return (
      <ErrorState
        title="Fallo al obtener linaje"
        message={error || 'No se pudieron recuperar los metadatos de auditoría.'}
        onRetry={fetchLineage}
      />
    );
  }

  const rec = data.reconciliation || {};
  const nodes = data.nodes || [];

  return (
    <div className="space-y-6">
      {/* Header & Reconciliation Formula */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <Database className="w-64 h-64 text-rose-500" />
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-rose-500/10 text-rose-400 rounded-lg border border-rose-500/30">
                <Layers className="w-5 h-5" />
              </span>
              <h2 className="text-lg font-bold text-white tracking-tight">
                Gobernanza de Datos & Linaje de Extremo a Extremo
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Trazabilidad determinista desde los feeds USGS hasta el consumo analítico en Gold.
            </p>
          </div>

          <button
            onClick={fetchLineage}
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition-colors self-start md:self-auto"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Actualizar Linaje</span>
          </button>
        </div>

        {/* Ecuación de Conciliación Matemática */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 bg-slate-950/70 rounded-xl border border-slate-800/80">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
              Ecuación Medallion
            </span>
            <div className="text-sm font-mono font-bold text-rose-400 mt-1">
              N_raw = N_curated + N_quarantine
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Conciliación estricta 0 pérdidas</div>
          </div>

          <div className="p-4 bg-slate-950/70 rounded-xl border border-slate-800/80">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
              Capa Gold (Certificados)
            </span>
            <div className="text-2xl font-black text-emerald-400 mt-1">
              {rec.total_curated || 0}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">100% conformes a Pandera</div>
          </div>

          <div className="p-4 bg-slate-950/70 rounded-xl border border-slate-800/80">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
              Cuarentena (Aislados)
            </span>
            <div className="text-2xl font-black text-rose-400 mt-1">
              {rec.total_quarantined || 0}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Desviados con motivo forense</div>
          </div>

          <div className="p-4 bg-slate-950/70 rounded-xl border border-slate-800/80">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
              Índice de Calidad Global
            </span>
            <div className="text-2xl font-black text-cyan-400 mt-1">
              {rec.quality_score_pct || 100}%
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Lag frescura: {rec.freshness_lag_seconds || 0}s
            </div>
          </div>
        </div>
      </div>

      {/* Visual Pipeline Stages */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Stage 1: Fuentes */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-blue-500/20 text-blue-300 rounded border border-blue-500/30">
                1. Fuentes
              </span>
              <span className="text-[11px] text-slate-400 font-mono">REST / GeoJSON</span>
            </div>
            <h3 className="text-sm font-bold text-white mb-2">USGS Catalog Services</h3>
            <ul className="text-xs text-slate-300 space-y-2">
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 mt-0.5 shrink-0" />
                <span>all_hour.geojson (c/ 5m)</span>
              </li>
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 mt-0.5 shrink-0" />
                <span>FDSNWS Query API (30 días)</span>
              </li>
            </ul>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-500">
            Orquestado por Airflow DAGs
          </div>
        </div>

        {/* Stage 2: Bronze & Silver */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 rounded border border-amber-500/30">
                2. Bronze & Silver
              </span>
              <span className="text-[11px] text-slate-400 font-mono">Postgres 16</span>
            </div>
            <h3 className="text-sm font-bold text-white mb-2">Almacén & Normalización</h3>
            <ul className="text-xs text-slate-300 space-y-2">
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
                <span>raw: payload JSONB inmutable</span>
              </li>
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
                <span>staging: tipado fuerte & UTC</span>
              </li>
            </ul>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-500">
            Rol: sismo_ingest / sismo_transform
          </div>
        </div>

        {/* Stage 3: Pandera Gate */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-rose-500/20 text-rose-300 rounded border border-rose-500/30">
                3. Quality Gate
              </span>
              <span className="text-[11px] text-slate-400 font-mono">Pandera</span>
            </div>
            <h3 className="text-sm font-bold text-white mb-2">Contratos de Esquema</h3>
            <ul className="text-xs text-slate-300 space-y-2">
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                <span>Lat [-90, 90] & Lon [-180, 180]</span>
              </li>
              <li className="flex items-start gap-1.5">
                <AlertOctagon className="w-3.5 h-3.5 text-rose-400 mt-0.5 shrink-0" />
                <span>Cuarentena con motivo de rechazo</span>
              </li>
            </ul>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-500">
            Score actual: {rec.quality_score_pct || 100}%
          </div>
        </div>

        {/* Stage 4: Gold & Serving */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 rounded border border-emerald-500/30">
                4. Gold & Serving
              </span>
              <span className="text-[11px] text-slate-400 font-mono">FastAPI + SSE</span>
            </div>
            <h3 className="text-sm font-bold text-white mb-2">Consumo en Vivo</h3>
            <ul className="text-xs text-slate-300 space-y-2">
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                <span>curated: sólo lectura (RBAC)</span>
              </li>
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                <span>SSE /api/stream + Reportes IA</span>
              </li>
            </ul>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-500">
            Rol: sismo_reader (Solo SELECT)
          </div>
        </div>
      </div>

      {/* Nodes Inventory Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-rose-400" />
            <h3 className="text-sm font-bold text-white">
              Catálogo de Entidades y Contratos de Datos (Lineage Nodes)
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {nodes.length} nodos mapeados
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800 uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-6 py-3">Nodo / Entidad</th>
                <th className="px-6 py-3">Capa</th>
                <th className="px-6 py-3">Categoría</th>
                <th className="px-6 py-3">Detalle / Regla de Gobernanza</th>
                <th className="px-6 py-3">Volumen</th>
                <th className="px-6 py-3">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 font-mono">
              {nodes.map((node: any) => (
                <tr key={node.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="px-6 py-3 font-bold text-white font-sans">{node.name}</td>
                  <td className="px-6 py-3">
                    <span className="px-2 py-0.5 text-[10px] rounded uppercase font-semibold bg-slate-800 text-slate-300">
                      {node.layer}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-slate-400 font-sans">{node.category}</td>
                  <td className="px-6 py-3 text-slate-300 font-sans max-w-xs truncate">
                    {node.description || node.policy || node.protocol}
                  </td>
                  <td className="px-6 py-3 text-emerald-400 font-bold">
                    {node.records !== undefined ? node.records : '—'}
                  </td>
                  <td className="px-6 py-3">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                      {node.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
