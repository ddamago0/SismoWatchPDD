import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { QuarantineRecord } from '../types';
import { ShieldCheck, ShieldAlert, Play, Database, CheckCircle, AlertOctagon, RefreshCw } from 'lucide-react';

export const QualityPanel: React.FC = () => {
  const { isAdmin, setShowLoginModal } = useAuth();
  const [quarantineRecords, setQuarantineRecords] = useState<QuarantineRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [triggering, setTriggering] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchQuarantine = async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      const data = await api.getQuarantine();
      setQuarantineRecords(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchQuarantine();
    }
  }, [isAdmin]);

  const handleTriggerDag = async (dagId: string) => {
    setTriggering(dagId);
    setFeedback(null);
    try {
      const res = await api.triggerDag(dagId);
      setFeedback({ type: 'success', message: `Pipeline '${dagId}' disparado exitosamente en Airflow.` });
      setTimeout(() => setFeedback(null), 5000);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Error al disparar pipeline' });
    } finally {
      setTriggering(null);
    }
  };

  return (
    <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-xl p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/30">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white tracking-tight">
                Panel de Calidad Pandera & Cuarentena (RBAC)
              </h3>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${isAdmin ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-slate-800 text-slate-400'}`}>
                {isAdmin ? 'Modo Administrador' : 'Modo Viewer'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Aislamiento preventivo de anomalías de esquema antes de la capa Gold (`curated.quality_quarantine`)
            </p>
          </div>
        </div>

        {/* Admin Dag Triggers */}
        {isAdmin && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleTriggerDag('dag_ingesta_usgs')}
              disabled={triggering !== null}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 hover:text-white text-xs font-semibold rounded-lg border border-indigo-500/40 transition-colors disabled:opacity-50"
            >
              <Play className="w-3 h-3" />
              <span>{triggering === 'dag_ingesta_usgs' ? 'Ejecutando...' : 'Ejecutar Ingesta'}</span>
            </button>
            <button
              onClick={() => handleTriggerDag('dag_backfill_historico')}
              disabled={triggering !== null}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-600/30 hover:bg-purple-600/50 text-purple-300 hover:text-white text-xs font-semibold rounded-lg border border-purple-500/40 transition-colors disabled:opacity-50"
            >
              <Database className="w-3 h-3" />
              <span>{triggering === 'dag_backfill_historico' ? 'Ejecutando...' : 'Backfill 30d'}</span>
            </button>
            <button
              onClick={fetchQuarantine}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
              title="Recargar cuarentena"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        )}
      </div>

      {feedback && (
        <div className={`mt-3 p-3 rounded-lg text-xs font-medium border ${feedback.type === 'success' ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800' : 'bg-rose-950/40 text-rose-300 border-rose-800'}`}>
          {feedback.message}
        </div>
      )}

      {/* Rules Summary Card */}
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-3 bg-slate-950/50 rounded-lg border border-slate-800/80">
          <div className="text-slate-400 text-[10px] uppercase font-semibold">Límites Geográficos</div>
          <div className="text-white font-mono mt-0.5 font-bold">Lat [-90, 90], Lon [-180, 180]</div>
          <div className="text-emerald-400 text-[10px] mt-1 flex items-center gap-1">
            <CheckCircle className="w-3 h-3" /> Regla Bloqueante
          </div>
        </div>
        <div className="p-3 bg-slate-950/50 rounded-lg border border-slate-800/80">
          <div className="text-slate-400 text-[10px] uppercase font-semibold">Rango Magnitud</div>
          <div className="text-white font-mono mt-0.5 font-bold">Mag [-2.0, 10.5] Mw</div>
          <div className="text-emerald-400 text-[10px] mt-1 flex items-center gap-1">
            <CheckCircle className="w-3 h-3" /> Regla Bloqueante
          </div>
        </div>
        <div className="p-3 bg-slate-950/50 rounded-lg border border-slate-800/80">
          <div className="text-slate-400 text-[10px] uppercase font-semibold">Profundidad Máx</div>
          <div className="text-white font-mono mt-0.5 font-bold">[-10, 1000] km</div>
          <div className="text-emerald-400 text-[10px] mt-1 flex items-center gap-1">
            <CheckCircle className="w-3 h-3" /> Regla Bloqueante
          </div>
        </div>
        <div className="p-3 bg-slate-950/50 rounded-lg border border-slate-800/80">
          <div className="text-slate-400 text-[10px] uppercase font-semibold">Integridad Identificador</div>
          <div className="text-white font-mono mt-0.5 font-bold">ID No Nulo & Único</div>
          <div className="text-emerald-400 text-[10px] mt-1 flex items-center gap-1">
            <CheckCircle className="w-3 h-3" /> Idempotencia Garantizada
          </div>
        </div>
      </div>

      {/* Quarantine Table (RBAC Protected) */}
      <div className="mt-4">
        {isAdmin ? (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Eventos en Cuarentena (`curated.quality_quarantine`)
              </span>
              <span className="text-[11px] text-slate-400 font-medium">
                Total aislados: {quarantineRecords.length}
              </span>
            </div>

            {quarantineRecords.length === 0 ? (
              <div className="p-6 bg-slate-950/40 rounded-xl border border-slate-800 text-center text-xs text-slate-400">
                <CheckCircle className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
                No hay sismos en cuarentena actualmente. Todas las ingestas recientes cumplen 100% las reglas de Pandera.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-slate-800">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="px-3 py-2.5">ID Sismo</th>
                      <th className="px-3 py-2.5">Motivo de Rechazo</th>
                      <th className="px-3 py-2.5">Reglas Violadas</th>
                      <th className="px-3 py-2.5">Fecha Cuarentena</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 bg-slate-950/40">
                    {quarantineRecords.map((q) => (
                      <tr key={q.id} className="hover:bg-slate-800/30">
                        <td className="px-3 py-2 font-mono text-white text-[11px]">{q.id}</td>
                        <td className="px-3 py-2 text-rose-400 font-semibold">{q.rejection_reason}</td>
                        <td className="px-3 py-2">
                          <div className="flex flex-wrap gap-1">
                            {q.failed_rules?.map((r, i) => (
                              <span key={i} className="px-1.5 py-0.5 bg-rose-950/50 text-rose-300 text-[10px] rounded border border-rose-800/40">
                                {r}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-slate-400 text-[11px]">
                          {new Date(q.quarantine_timestamp).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <div className="p-6 bg-slate-950/50 rounded-xl border border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertOctagon className="w-6 h-6 text-amber-400 flex-shrink-0" />
              <div>
                <h4 className="text-xs font-bold text-white">Detalle de Cuarentena Restringido por RBAC</h4>
                <p className="text-[11px] text-slate-400">
                  Tu rol actual (<span className="text-blue-400 font-semibold">viewer</span>) solo puede ver métricas de salud. Para inspeccionar registros descartados o disparar tareas, inicia sesión como <span className="text-amber-400 font-semibold">admin</span>.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowLoginModal(true)}
              className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-semibold transition-colors"
            >
              Cambiar a Admin
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
