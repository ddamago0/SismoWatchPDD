import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { QuarantineRecord } from '../types';
import {
  ShieldAlert,
  Play,
  Database,
  RefreshCw,
  Workflow,
  AlertOctagon,
  Bot,
  Layers,
  Code,
} from 'lucide-react';
import { LineagePanel } from './LineagePanel';

export const AdminAuditPanel: React.FC = () => {
  const [quarantineRecords, setQuarantineRecords] = useState<QuarantineRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [triggering, setTriggering] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [selectedRawPayload, setSelectedRawPayload] = useState<any | null>(null);
  const [activeSection, setActiveSection] = useState<'quarantine' | 'lineage'>('quarantine');

  const fetchQuarantine = async () => {
    setLoading(true);
    try {
      const data = await api.getQuarantine();
      setQuarantineRecords(data);
    } catch (err: any) {
      console.error('Error fetching quarantine records', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuarantine();
  }, []);

  const handleTriggerDag = async (dagId: string) => {
    setTriggering(dagId);
    setFeedback(null);
    try {
      const res = await api.triggerDag(dagId);
      setFeedback({
        type: 'success',
        message: `Pipeline '${dagId}' ejecutado exitosamente en Apache Airflow.`,
      });
      setTimeout(() => setFeedback(null), 5000);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Error al ejecutar pipeline en Airflow' });
    } finally {
      setTriggering(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Admin Action Bar (Only visible to Admin) */}
      <div className="p-5 bg-[#0b121e] border border-rose-900/40 rounded-2xl flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-rose-600/20 text-rose-400 rounded-xl border border-rose-500/30">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-mono font-bold text-white uppercase tracking-wider">
                Consola de Administración & Control Airflow
              </h2>
              <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                PRIVILEGIO ADMIN
              </span>
            </div>
            <p className="text-[11px] font-mono text-slate-400">
              Disparadores de pipelines de orquestación y auditoría de eventos aislados
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => handleTriggerDag('dag_ingesta_usgs')}
            disabled={triggering !== null}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 text-xs font-mono font-bold rounded-xl border border-blue-500/30 transition-colors disabled:opacity-50"
          >
            <Play className="w-3 h-3" />
            <span>{triggering === 'dag_ingesta_usgs' ? 'Ejecutando...' : 'Lanzar Ingesta'}</span>
          </button>

          <button
            onClick={() => handleTriggerDag('dag_backfill_historico')}
            disabled={triggering !== null}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 text-xs font-mono font-bold rounded-xl border border-purple-500/30 transition-colors disabled:opacity-50"
          >
            <Database className="w-3 h-3" />
            <span>{triggering === 'dag_backfill_historico' ? 'Ejecutando...' : 'Backfill 30d'}</span>
          </button>

          <button
            onClick={() => handleTriggerDag('dag_reporte_ia_anomalias')}
            disabled={triggering !== null}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 text-xs font-mono font-bold rounded-xl border border-amber-500/30 transition-colors disabled:opacity-50"
          >
            <Bot className="w-3 h-3" />
            <span>{triggering === 'dag_reporte_ia_anomalias' ? 'Ejecutando...' : 'Regenerar IA'}</span>
          </button>

          <button
            onClick={fetchQuarantine}
            className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl border border-slate-700 transition-colors"
            title="Recargar datos de auditoría"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-rose-400' : ''}`} />
          </button>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-3 rounded-xl text-xs font-mono border ${
            feedback.type === 'success'
              ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800'
              : 'bg-rose-950/40 text-rose-300 border-rose-800'
          }`}
        >
          {feedback.message}
        </div>
      )}

      {/* Sub-navigation switcher for Admin view */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveSection('quarantine')}
          className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all ${
            activeSection === 'quarantine'
              ? 'bg-rose-600 text-white shadow'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          Registros en Cuarentena ({quarantineRecords.length})
        </button>

        <button
          onClick={() => setActiveSection('lineage')}
          className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all ${
            activeSection === 'lineage'
              ? 'bg-rose-600 text-white shadow'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          Linaje & Conciliación Medallion
        </button>
      </div>

      {activeSection === 'quarantine' ? (
        <div className="space-y-4">
          <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-[#0b121e]">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#070b14] text-slate-400 text-[10px] uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">ID Evento</th>
                  <th className="px-4 py-3">Regla Violada</th>
                  <th className="px-4 py-3">Motivo del Rechazo</th>
                  <th className="px-4 py-3">Batch ID</th>
                  <th className="px-4 py-3">Fecha de Aislamiento</th>
                  <th className="px-4 py-3 text-right">Payload Crudo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {quarantineRecords.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                      No hay registros en cuarentena. La calidad del feed actual es del 100%.
                    </td>
                  </tr>
                ) : (
                  quarantineRecords.map((q) => (
                    <tr key={q.quarantine_id} className="hover:bg-slate-900/50 transition-colors">
                      <td className="px-4 py-3 font-bold text-rose-400 whitespace-nowrap">{q.event_id}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-500/10 text-rose-400 border border-rose-500/20">
                          {q.rule_failed}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-300">{q.rejection_reason}</td>
                      <td className="px-4 py-3 text-slate-500 text-[10px]">{q.batch_id}</td>
                      <td className="px-4 py-3 text-slate-400 text-[10px] whitespace-nowrap">
                        {new Date(q.failed_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setSelectedRawPayload(q.raw_payload)}
                          className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-blue-400 text-[10px] border border-slate-700 transition-colors inline-flex items-center gap-1"
                        >
                          <Code className="w-3 h-3" />
                          <span>Ver JSON</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Raw Payload Modal */}
          {selectedRawPayload && (
            <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-[#0b121e] border border-slate-700 rounded-2xl max-w-xl w-full p-5 shadow-2xl space-y-3 font-mono">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <h4 className="text-xs font-bold text-white uppercase">Payload Crudo Rechazado</h4>
                  <button
                    onClick={() => setSelectedRawPayload(null)}
                    className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded bg-slate-800"
                  >
                    Cerrar
                  </button>
                </div>
                <pre className="text-xs bg-[#070b14] p-3 rounded-xl border border-slate-850 overflow-x-auto text-emerald-400 max-h-80">
                  {JSON.stringify(selectedRawPayload, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      ) : (
        <LineagePanel />
      )}
    </div>
  );
};

