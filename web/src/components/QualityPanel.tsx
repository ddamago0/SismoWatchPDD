import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { QuarantineRecord } from '../types';
import {
  ShieldCheck,
  ShieldAlert,
  Play,
  Database,
  CheckCircle,
  AlertOctagon,
  RefreshCw,
  Lock,
} from 'lucide-react';

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
      console.error('Error fetching quarantine', err);
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
      setFeedback({
        type: 'success',
        message: `Pipeline '${dagId}' disparado exitosamente en Apache Airflow.`,
      });
      setTimeout(() => setFeedback(null), 5000);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Error al disparar pipeline' });
    } finally {
      setTriggering(null);
    }
  };

  return (
    <div className="bg-dark-900/90 backdrop-blur-md border border-white/10 rounded-2xl p-5 shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-mono font-bold text-white tracking-wider uppercase">
                Quality Gate Pandera & Cuarentena Medallion
              </h3>
              <span
                className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider ${
                  isAdmin
                    ? 'bg-coral-500/15 text-coral-300 border border-coral-500/30'
                    : 'bg-dark-850 text-slate-400 border border-white/5'
                }`}
              >
                {isAdmin ? 'ROL: ADMIN (AUDITORÍA TOTAL)' : 'ROL: VIEWER (SOLO LECTURA)'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono">
              Aislamiento determinista en `curated.quality_quarantine` antes de la persistencia en Gold
            </p>
          </div>
        </div>

        {/* Admin Dag Triggers */}
        {isAdmin && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleTriggerDag('dag_ingesta_usgs')}
              disabled={triggering !== null}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-cobalt-500/20 hover:bg-cobalt-500/30 text-cobalt-300 text-xs font-mono font-bold rounded-xl border border-cobalt-500/40 transition-colors disabled:opacity-50"
            >
              <Play className="w-3 h-3" />
              <span>{triggering === 'dag_ingesta_usgs' ? 'Ejecutando...' : 'Run Ingesta'}</span>
            </button>
            <button
              onClick={() => handleTriggerDag('dag_backfill_historico')}
              disabled={triggering !== null}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 text-xs font-mono font-bold rounded-xl border border-purple-500/40 transition-colors disabled:opacity-50"
            >
              <Database className="w-3 h-3" />
              <span>{triggering === 'dag_backfill_historico' ? 'Ejecutando...' : 'Run Backfill'}</span>
            </button>
            <button
              onClick={fetchQuarantine}
              className="p-1.5 bg-dark-950 hover:bg-dark-850 text-slate-300 rounded-xl border border-white/10 transition-colors"
              title="Recargar cuarentena"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cobalt-400' : ''}`} />
            </button>
          </div>
        )}
      </div>

      {feedback && (
        <div
          className={`mt-3 p-3 rounded-xl text-xs font-mono border ${
            feedback.type === 'success'
              ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800'
              : 'bg-rose-950/40 text-rose-300 border-rose-800'
          }`}
        >
          {feedback.message}
        </div>
      )}

      {/* Rules Validated by Pandera */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 my-4">
        <div className="p-3 bg-dark-950 rounded-xl border border-white/5">
          <div className="text-[10px] font-mono text-slate-500 uppercase font-bold">Límites Geográficos</div>
          <div className="text-xs font-mono font-bold text-slate-200 mt-1">Lat [-90, 90] &bull; Lon [-180, 180]</div>
          <div className="text-[10px] text-emerald-400 mt-1 flex items-center gap-1 font-mono">
            <CheckCircle className="w-3 h-3" /> Activo (GEOGRAPHIC_BOUNDS)
          </div>
        </div>

        <div className="p-3 bg-dark-950 rounded-xl border border-white/5">
          <div className="text-[10px] font-mono text-slate-500 uppercase font-bold">Rango de Magnitud</div>
          <div className="text-xs font-mono font-bold text-slate-200 mt-1">Mw [-2.0, 10.5] &bull; Not Null</div>
          <div className="text-[10px] text-emerald-400 mt-1 flex items-center gap-1 font-mono">
            <CheckCircle className="w-3 h-3" /> Activo (MAGNITUDE_BOUNDS)
          </div>
        </div>

        <div className="p-3 bg-dark-950 rounded-xl border border-white/5">
          <div className="text-[10px] font-mono text-slate-500 uppercase font-bold">Unicidad & Idempotencia</div>
          <div className="text-xs font-mono font-bold text-slate-200 mt-1">Primary Key `id` sin colisiones</div>
          <div className="text-[10px] text-emerald-400 mt-1 flex items-center gap-1 font-mono">
            <CheckCircle className="w-3 h-3" /> ON CONFLICT DO UPDATE
          </div>
        </div>
      </div>

      {/* Role-Specific Content */}
      {!isAdmin ? (
        <div className="p-5 bg-dark-950 rounded-xl border border-white/5 text-center space-y-2">
          <div className="inline-flex p-2 rounded-xl bg-cobalt-500/10 text-cobalt-400 border border-cobalt-500/20 mb-1">
            <Lock className="w-5 h-5" />
          </div>
          <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
            Detalle de Cuarentena Restringido a Administradores (RBAC)
          </h4>
          <p className="text-[11px] text-slate-400 max-w-lg mx-auto font-mono">
            Como usuario con rol <strong className="text-cobalt-400 font-bold">VIEWER</strong>, tienes visibilidad sobre las métricas globales de calidad y las reglas de Pandera, pero la inspección y reprocesamiento de payloads crudos aislados requiere privilegios de <strong className="text-coral-400 font-bold">ADMIN</strong>.
          </p>
          <button
            onClick={() => setShowLoginModal(true)}
            className="mt-2 px-3.5 py-1.5 rounded-xl bg-dark-850 hover:bg-dark-800 text-xs font-mono font-bold text-slate-200 border border-white/10 transition-colors"
          >
            Cambiar a Perfil Admin
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
            <span>Registros Aislados en Cuarentena ({quarantineRecords.length})</span>
            <span className="text-[10px] text-coral-400">Acceso exclusivo rol admin</span>
          </div>

          {loading ? (
            <div className="p-6 text-center text-xs font-mono text-slate-500 animate-pulse">
              Cargando registros aislados...
            </div>
          ) : quarantineRecords.length === 0 ? (
            <div className="p-6 bg-dark-950 rounded-xl border border-white/5 text-center text-xs font-mono text-slate-500">
              No hay sismos en cuarentena actualmente. Calidad del feed: 100%.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-white/10">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-dark-950 text-slate-400 text-[10px] uppercase tracking-wider border-b border-white/10">
                  <tr>
                    <th className="px-3 py-2">ID Evento</th>
                    <th className="px-3 py-2">Regla Violada</th>
                    <th className="px-3 py-2">Motivo del Rechazo</th>
                    <th className="px-3 py-2">Batch ID</th>
                    <th className="px-3 py-2">Fecha Aislamiento</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 bg-dark-900/60">
                  {quarantineRecords.map((q) => (
                    <tr key={q.quarantine_id} className="hover:bg-white/5 transition-colors">
                      <td className="px-3 py-2 font-bold text-rose-400 whitespace-nowrap">{q.event_id}</td>
                      <td className="px-3 py-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-500/10 text-rose-400 border border-rose-500/20">
                          {q.rule_failed}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-slate-300">{q.rejection_reason}</td>
                      <td className="px-3 py-2 text-slate-400 text-[10px]">{q.batch_id}</td>
                      <td className="px-3 py-2 text-slate-400 text-[10px] whitespace-nowrap">
                        {new Date(q.failed_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
