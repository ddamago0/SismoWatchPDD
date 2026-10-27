import React, { useState } from 'react';
import { AiReport } from '../types';
import { api } from '../services/api';
import { Bot, FileDown, CheckCircle2, ShieldAlert, Cpu, Sparkles, Download, Printer } from 'lucide-react';

interface AiReportCardProps {
  report: AiReport | null;
  loading: boolean;
}

export const AiReportCard: React.FC<AiReportCardProps> = ({ report, loading }) => {
  const [exporting, setExporting] = useState<'csv' | 'html' | null>(null);

  const handleExport = async (format: 'csv' | 'html') => {
    try {
      setExporting(format);
      await api.exportReport(format);
    } catch (err: any) {
      alert(`Error al exportar: ${err.message}`);
    } finally {
      setExporting(null);
    }
  };

  const getProviderBadge = (provider?: string) => {
    if (provider === 'gemini') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-blue-500/10 text-blue-400 border border-blue-500/30">
          <Sparkles className="w-3 h-3" /> Gemini 3.8 Flash
        </span>
      );
    }
    if (provider === 'groq') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-orange-500/10 text-orange-400 border border-orange-500/30">
          <Cpu className="w-3 h-3" /> Groq Failover (gpt-oss-120b)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-purple-500/10 text-purple-400 border border-purple-500/30">
        <Bot className="w-3 h-3" /> Motor Determinista
      </span>
    );
  };

  if (loading && !report) {
    return (
      <div className="h-64 bg-dark-900 rounded-2xl border border-white/5 animate-pulse p-6" />
    );
  }

  return (
    <div className="bg-dark-900/90 backdrop-blur-md border border-white/10 rounded-2xl p-5 shadow-xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-cobalt-500/10 text-cobalt-400 rounded-xl border border-cobalt-500/20">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-mono font-bold text-white tracking-wider uppercase">
                Boletín Ejecutivo Generado por IA
              </h3>
              {report?.validation_passed && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  <CheckCircle2 className="w-3 h-3" /> CERO ALUCINACIONES AUDITADO
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 font-mono">
              Evaluación multimodelo resiliente con verificación numérica por Regex en `validator.py`
            </p>
          </div>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-2">
          {report && getProviderBadge(report.provider)}
          <button
            onClick={() => handleExport('csv')}
            disabled={exporting !== null}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-dark-950 hover:bg-dark-850 text-slate-300 hover:text-white text-xs font-mono font-bold rounded-xl border border-white/10 transition-colors disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{exporting === 'csv' ? 'Exportando...' : 'CSV'}</span>
          </button>
          <button
            onClick={() => handleExport('html')}
            disabled={exporting !== null}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-cobalt-500 hover:bg-cobalt-600 text-white text-xs font-mono font-bold rounded-xl shadow-glow-cobalt transition-colors disabled:opacity-50"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>{exporting === 'html' ? 'Exportando...' : 'Imprimir / PDF'}</span>
          </button>
        </div>
      </div>

      {/* Content */}
      {report ? (
        <div className="mt-4 space-y-4 font-mono">
          {/* Micro KPIs Grid from report */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 bg-dark-950 rounded-xl border border-white/5">
              <span className="text-[10px] text-slate-500 uppercase">Sismos Analizados</span>
              <div className="text-base font-bold text-white mt-0.5">{report.total_earthquakes}</div>
            </div>
            <div className="p-3 bg-dark-950 rounded-xl border border-white/5">
              <span className="text-[10px] text-slate-500 uppercase">Magnitud Máxima</span>
              <div className="text-base font-bold text-coral-400 mt-0.5">{report.max_magnitude} Mw</div>
            </div>
            <div className="p-3 bg-dark-950 rounded-xl border border-white/5">
              <span className="text-[10px] text-slate-500 uppercase">Anomalías Detectadas</span>
              <div className="text-base font-bold text-amber-400 mt-0.5">{report.anomalies_detected}</div>
            </div>
            <div className="p-3 bg-dark-950 rounded-xl border border-white/5">
              <span className="text-[10px] text-slate-500 uppercase">Modelo Evaluador</span>
              <div className="text-xs font-bold text-slate-300 mt-1 truncate">{report.model_name || report.provider}</div>
            </div>
          </div>

          {/* Narrative Summary */}
          <div className="p-4 bg-dark-950 rounded-xl border border-white/5 text-xs text-slate-300 leading-relaxed font-sans whitespace-pre-line">
            {report.summary_text}
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-500 pt-2 border-t border-white/5">
            <span>Fecha del Reporte: {report.report_date}</span>
            <span>Generado: {new Date(report.created_at).toLocaleString()}</span>
          </div>
        </div>
      ) : (
        <div className="p-8 text-center text-xs font-mono text-slate-500">
          No hay informe ejecutivo disponible para el ciclo actual. El DAG `dag_reporte_ia_anomalias` se ejecuta a las 00:00 UTC.
        </div>
      )}
    </div>
  );
};
