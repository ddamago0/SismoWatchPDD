import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { QuarantineRecord } from '../types';
import {
  ShieldAlert,
  Play,
  Database,
  RefreshCw,
  Bot,
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
      await api.triggerDag(dagId);
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
      <div className="p-5 bg-[#171211] border border-[#3b1d22] rounded-2xl flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#2b1418] text-[#f87171] rounded-xl border border-[#4f2026]/70">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-mono font-semibold text-[#f7f7f9] uppercase tracking-wider">
                Consola de Administración & Control Airflow
              </h2>
              <span className="px-2 py-0.5 rounded text-[9px] font-mono font-medium bg-[#2b1418] text-[#f87171] border border-[#4f2026]/70">
                PRIVILEGIO ADMIN
              </span>
            </div>
            <p className="text-[11px] font-mono text-[#9b9baa]">
              Disparadores de pipelines de orquestación y auditoría de eventos aislados
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => handleTriggerDag('dag_ingesta_usgs')}
            disabled={triggering !== null}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1f1715] hover:bg-[#281e1b] text-[#ececf1] text-xs font-mono font-medium rounded-xl border border-[#2b211e] transition-colors disabled:opacity-50"
          >
            <Play className="w-3 h-3 text-[#d5c4fb]" />
            <span>{triggering === 'dag_ingesta_usgs' ? 'Ejecutando...' : 'Lanzar Ingesta'}</span>
          </button>

          <button
            onClick={() => handleTriggerDag('dag_backfill_historico')}
            disabled={triggering !== null}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1f1715] hover:bg-[#281e1b] text-[#ececf1] text-xs font-mono font-medium rounded-xl border border-[#2b211e] transition-colors disabled:opacity-50"
          >
            <Database className="w-3 h-3 text-[#d5c4fb]" />
            <span>{triggering === 'dag_backfill_historico' ? 'Ejecutando...' : 'Backfill 30d'}</span>
          </button>

          <button
            onClick={() => handleTriggerDag('dag_reporte_ia_anomalias')}
            disabled={triggering !== null}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1f1715] hover:bg-[#281e1b] text-[#ececf1] text-xs font-mono font-medium rounded-xl border border-[#2b211e] transition-colors disabled:opacity-50"
          >
            <Bot className="w-3 h-3 text-[#d5c4fb]" />
            <span>{triggering === 'dag_reporte_ia_anomalias' ? 'Ejecutando...' : 'Regenerar IA'}</span>
          </button>

          <button
            onClick={fetchQuarantine}
            className="p-1.5 bg-[#1f1715] hover:bg-[#281e1b] text-[#ececf1] rounded-xl border border-[#2b211e] transition-colors"
            title="Recargar datos de auditoría"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#d5c4fb]' : ''}`} />
          </button>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-3 rounded-xl text-xs font-mono border ${
            feedback.type === 'success'
              ? 'bg-[#14231b] text-[#86efac] border-[#234231]/60'
              : 'bg-[#2b1418] text-[#f87171] border-[#4f2026]/70'
          }`}
        >
          {feedback.message}
        </div>
      )}

      {/* Sub-navigation switcher for Admin view */}
      <div className="flex items-center gap-2 border-b border-[#261f1c] pb-3">
        <button
          onClick={() => setActiveSection('quarantine')}
          className={`px-3 py-1.5 rounded-xl text-xs font-mono font-medium transition-all ${
            activeSection === 'quarantine'
              ? 'bg-[#844dea] text-white shadow-sm'
              : 'bg-[#171211] text-[#9b9baa] hover:text-[#f7f7f9] border border-[#261f1c]'
          }`}
        >
          Registros en Cuarentena ({quarantineRecords.length})
        </button>

        <button
          onClick={() => setActiveSection('lineage')}
          className={`px-3 py-1.5 rounded-xl text-xs font-mono font-medium transition-all ${
            activeSection === 'lineage'
              ? 'bg-[#844dea] text-white shadow-sm'
              : 'bg-[#171211] text-[#9b9baa] hover:text-[#f7f7f9] border border-[#261f1c]'
          }`}
        >
          Linaje & Conciliación Medallion
        </button>
      </div>

      {activeSection === 'quarantine' ? (
        <div className="space-y-4">
          <div className="overflow-x-auto rounded-2xl border border-[#261f1c] bg-[#171211]">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#120e0d] text-[#9b9baa] text-[10px] uppercase tracking-wider border-b border-[#261f1c]">
                <tr>
                  <th className="px-4 py-3">ID Evento</th>
                  <th className="px-4 py-3">Regla Violada</th>
                  <th className="px-4 py-3">Motivo del Rechazo</th>
                  <th className="px-4 py-3">Batch ID</th>
                  <th className="px-4 py-3">Fecha de Aislamiento</th>
                  <th className="px-4 py-3 text-right">Payload Crudo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#241c19]">
                {quarantineRecords.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-[#9b9baa]">
                      No hay registros en cuarentena. La calidad del feed actual es del 100%.
                    </td>
                  </tr>
                ) : (
                  quarantineRecords.map((q) => (
                    <tr key={q.quarantine_id} className="hover:bg-[#1e1715] transition-colors">
                      <td className="px-4 py-3 font-semibold text-[#f87171] whitespace-nowrap">{q.event_id}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium uppercase bg-[#2b1418] text-[#f87171] border border-[#4f2026]/70">
                          {q.rule_failed}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[#ececf1]">{q.rejection_reason}</td>
                      <td className="px-4 py-3 text-[#9b9baa] text-[10px]">{q.batch_id}</td>
                      <td className="px-4 py-3 text-[#9b9baa] text-[10px] whitespace-nowrap">
                        {new Date(q.failed_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setSelectedRawPayload(q.raw_payload)}
                          className="px-2.5 py-1 rounded-lg bg-[#1f1715] hover:bg-[#281e1b] text-[#d5c4fb] text-[10px] border border-[#2b211e] transition-colors inline-flex items-center gap-1"
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
              <div className="bg-[#171211] border border-[#332b27] rounded-2xl max-w-xl w-full p-5 shadow-2xl space-y-3 font-mono">
                <div className="flex items-center justify-between pb-2 border-b border-[#261f1c]">
                  <h4 className="text-xs font-semibold text-[#f7f7f9] uppercase">Payload Crudo Rechazado</h4>
                  <button
                    onClick={() => setSelectedRawPayload(null)}
                    className="text-[#9b9baa] hover:text-[#f7f7f9] text-xs px-2.5 py-1 rounded-lg bg-[#1f1715] border border-[#2b211e]"
                  >
                    Cerrar
                  </button>
                </div>
                <pre className="text-xs bg-[#120e0d] p-3 rounded-xl border border-[#241c19] overflow-x-auto text-[#86efac] max-h-80">
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
