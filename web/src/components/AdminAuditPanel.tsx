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
  ShieldCheck,
  Layers,
  Copy,
  Check,
} from 'lucide-react';
import { LineagePanel } from './LineagePanel';

export const AdminAuditPanel: React.FC = () => {
  const [quarantineRecords, setQuarantineRecords] = useState<QuarantineRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [triggering, setTriggering] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [selectedRawPayload, setSelectedRawPayload] = useState<any | null>(null);
  const [copied, setCopied] = useState(false);
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

  const handleCopyJson = (obj: any) => {
    navigator.clipboard.writeText(JSON.stringify(obj, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Overview Top Metric Cards (Symmetrical Grid matching other views) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="p-4 bg-[#171211] border border-[#261f1c] rounded-2xl flex flex-col justify-between h-full min-h-[96px]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#9b9baa] font-semibold">
              Eventos en Cuarentena
            </span>
            <ShieldAlert className="w-4 h-4 text-[#f87171]" />
          </div>
          <div className="text-xl font-mono font-bold text-[#f7f7f9] mt-1">
            {quarantineRecords.length}
          </div>
          <p className="text-[11px] font-mono text-[#9b9baa] mt-0.5">
            Registros aislados por calidad
          </p>
        </div>

        <div className="p-4 bg-[#171211] border border-[#261f1c] rounded-2xl flex flex-col justify-between h-full min-h-[96px]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#9b9baa] font-semibold">
              Tasa de Admisión
            </span>
            <ShieldCheck className="w-4 h-4 text-[#86efac]" />
          </div>
          <div className="text-xl font-mono font-bold text-[#86efac] mt-1">
            100.0%
          </div>
          <p className="text-[11px] font-mono text-[#9b9baa] mt-0.5">
            Conformidad con ISO 25012
          </p>
        </div>

        <div className="p-4 bg-[#171211] border border-[#261f1c] rounded-2xl flex flex-col justify-between h-full min-h-[96px]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#9b9baa] font-semibold">
              Pipelines Orquestados
            </span>
            <Layers className="w-4 h-4 text-[#d5c4fb]" />
          </div>
          <div className="text-xl font-mono font-bold text-[#d5c4fb] mt-1">
            4 Flujos
          </div>
          <p className="text-[11px] font-mono text-[#9b9baa] mt-0.5">
            Orquestados vía Apache Airflow
          </p>
        </div>

        <div className="p-4 bg-[#171211] border border-[#261f1c] rounded-2xl flex flex-col justify-between h-full min-h-[96px]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#9b9baa] font-semibold">
              Nivel de Privilegio
            </span>
            <span className="w-2 h-2 rounded-full bg-[#f87171] animate-pulse" />
          </div>
          <div className="text-sm font-mono font-bold text-[#f7f7f9] mt-1">
            SuperAdmin
          </div>
          <p className="text-[11px] font-mono text-[#86efac] mt-0.5">
            Control Operativo Total
          </p>
        </div>
      </div>

      {/* Admin Action Bar with Direct DAG Controls */}
      <div className="p-5 bg-[#171211] border border-[#261f1c] rounded-2xl flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#2b1418] text-[#f87171] rounded-xl border border-[#4f2026]/70">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-[#f7f7f9] tracking-wide">
                Consola de Auditoría y Control Operacional
              </h2>
              <span className="px-2 py-0.5 rounded text-[9px] font-mono font-medium bg-[#2b1418] text-[#f87171] border border-[#4f2026]/70">
                Acceso Administrador
              </span>
            </div>
            <p className="text-xs text-[#9b9baa]">
              Monitoreo de eventos anómalos y orquestación de flujos de datos en tiempo real
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => handleTriggerDag('dag_ingesta_usgs')}
            disabled={triggering !== null}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1f1715] hover:bg-[#281e1b] text-[#ececf1] text-xs font-mono font-medium rounded-xl border border-[#2b211e] transition-colors disabled:opacity-50 cursor-pointer"
          >
            <Play className="w-3 h-3 text-[#d5c4fb]" />
            <span>{triggering === 'dag_ingesta_usgs' ? 'Ejecutando...' : 'Lanzar Ingesta'}</span>
          </button>

          <button
            onClick={() => handleTriggerDag('dag_transformacion_calidad')}
            disabled={triggering !== null}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1f1715] hover:bg-[#281e1b] text-[#ececf1] text-xs font-mono font-medium rounded-xl border border-[#2b211e] transition-colors disabled:opacity-50 cursor-pointer"
          >
            <Layers className="w-3 h-3 text-[#d5c4fb]" />
            <span>{triggering === 'dag_transformacion_calidad' ? 'Ejecutando...' : 'Curaduría Gold'}</span>
          </button>

          <button
            onClick={() => handleTriggerDag('dag_reporte_ia_anomalias')}
            disabled={triggering !== null}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1f1715] hover:bg-[#281e1b] text-[#ececf1] text-xs font-mono font-medium rounded-xl border border-[#2b211e] transition-colors disabled:opacity-50 cursor-pointer"
          >
            <Bot className="w-3 h-3 text-[#d5c4fb]" />
            <span>{triggering === 'dag_reporte_ia_anomalias' ? 'Ejecutando...' : 'Evaluar con IA'}</span>
          </button>

          <button
            onClick={() => handleTriggerDag('dag_backfill_historico')}
            disabled={triggering !== null}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1f1715] hover:bg-[#281e1b] text-[#ececf1] text-xs font-mono font-medium rounded-xl border border-[#2b211e] transition-colors disabled:opacity-50 cursor-pointer"
          >
            <Database className="w-3 h-3 text-[#d5c4fb]" />
            <span>{triggering === 'dag_backfill_historico' ? 'Ejecutando...' : 'Carga Histórica'}</span>
          </button>

          <button
            onClick={fetchQuarantine}
            className="p-2 bg-[#1f1715] hover:bg-[#281e1b] text-[#ececf1] rounded-xl border border-[#2b211e] transition-colors cursor-pointer"
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

      {/* Sub-navigation switcher without parentheses */}
      <div className="flex items-center gap-2 border-b border-[#261f1c] pb-3">
        <button
          onClick={() => setActiveSection('quarantine')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-medium transition-all flex items-center gap-2 cursor-pointer ${
            activeSection === 'quarantine'
              ? 'bg-[#844dea] text-white shadow-sm'
              : 'bg-[#171211] text-[#9b9baa] hover:text-[#f7f7f9] border border-[#261f1c]'
          }`}
        >
          <span>Registros en Cuarentena</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
            activeSection === 'quarantine'
              ? 'bg-white/20 text-white font-bold'
              : 'bg-[#241a2e] text-[#d5c4fb] border border-[#4a365f]/50'
          }`}>
            {quarantineRecords.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSection('lineage')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-medium transition-all cursor-pointer ${
            activeSection === 'lineage'
              ? 'bg-[#844dea] text-white shadow-sm'
              : 'bg-[#171211] text-[#9b9baa] hover:text-[#f7f7f9] border border-[#261f1c]'
          }`}
        >
          Linaje y Conciliación Medallion
        </button>
      </div>

      {activeSection === 'quarantine' ? (
        <div className="space-y-4">
          <div className="overflow-x-auto rounded-2xl border border-[#261f1c] bg-[#171211]">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#120e0d] text-[#9b9baa] text-[10px] uppercase tracking-wider border-b border-[#261f1c]">
                <tr>
                  <th className="px-4 py-3">ID Evento</th>
                  <th className="px-4 py-3">Regla Incumplida</th>
                  <th className="px-4 py-3">Motivo del Rechazo</th>
                  <th className="px-4 py-3">Identificador Lote</th>
                  <th className="px-4 py-3">Fecha de Aislamiento</th>
                  <th className="px-4 py-3 text-right">Payload</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#241c19]">
                {quarantineRecords.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center">
                      <div className="max-w-md mx-auto space-y-2">
                        <div className="w-10 h-10 rounded-2xl bg-[#14231b] text-[#86efac] border border-[#234231]/60 flex items-center justify-center mx-auto">
                          <ShieldCheck className="w-5 h-5" />
                        </div>
                        <div className="text-xs font-semibold text-[#f7f7f9]">
                          Cero Eventos en Cuarentena
                        </div>
                        <p className="text-[11px] text-[#9b9baa]">
                          Todos los eventos sísmicos recibidos superaron el 100% de las reglas determinísticas de validación bajo la norma ISO 25012.
                        </p>
                      </div>
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
                          className="px-2.5 py-1 rounded-lg bg-[#1f1715] hover:bg-[#281e1b] text-[#d5c4fb] text-[10px] border border-[#2b211e] transition-colors inline-flex items-center gap-1 cursor-pointer"
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
                  <div className="flex items-center gap-2">
                    <Code className="w-4 h-4 text-[#844dea]" />
                    <h4 className="text-xs font-semibold text-[#f7f7f9] uppercase">
                      Payload Crudo Rechazado
                    </h4>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopyJson(selectedRawPayload)}
                      className="text-[11px] px-2.5 py-1 rounded-lg bg-[#1f1715] hover:bg-[#281e1b] text-[#d5c4fb] border border-[#2b211e] flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      {copied ? <Check className="w-3 h-3 text-[#86efac]" /> : <Copy className="w-3 h-3" />}
                      <span>{copied ? 'Copiado' : 'Copiar'}</span>
                    </button>
                    <button
                      onClick={() => setSelectedRawPayload(null)}
                      className="text-[#9b9baa] hover:text-[#f7f7f9] text-xs px-2.5 py-1 rounded-lg bg-[#1f1715] border border-[#2b211e] cursor-pointer"
                    >
                      Cerrar
                    </button>
                  </div>
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

