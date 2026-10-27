import React, { useState } from 'react';
import { AiReport } from '../types';
import { api } from '../services/api';
import { Bot, FileDown, CheckCircle2, ShieldAlert, Cpu, Sparkles, Download } from 'lucide-react';

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
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/30">
          <Sparkles className="w-3 h-3" /> Google Gemini 3.8 Flash
        </span>
      );
    }
    if (provider === 'groq') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-orange-500/10 text-orange-400 border border-orange-500/30">
          <Cpu className="w-3 h-3" /> Groq (gpt-oss-120b Failover)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-500/10 text-purple-400 border border-purple-500/30">
        <Bot className="w-3 h-3" /> Plantilla Determinista Fallback
      </span>
    );
  };

  if (loading && !report) {
    return (
      <div className="h-64 bg-slate-900/60 rounded-xl border border-slate-800 animate-pulse p-6" />
    );
  }

  return (
    <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-xl p-5 shadow-sm">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 text-indigo-400 rounded-xl border border-indigo-500/30">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white tracking-tight">
                Reporte Ejecutivo de Inteligencia Artificial
              </h3>
              {report?.validation_passed && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  <CheckCircle2 className="w-3 h-3" /> Validado Anti-Alucinación
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400">
              Evaluación multimodelo resiliente para toma de decisiones operativas en SuperApp
            </p>
          </div>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-2">
          {report && getProviderBadge(report.provider)}
          <button
            onClick={() => handleExport('csv')}
            disabled={exporting !== null}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium rounded-lg border border-slate-700 transition-colors disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{exporting === 'csv' ? 'Descargando...' : 'CSV'}</span>
          </button>
          <button
            onClick={() => handleExport('html')}
            disabled={exporting !== null}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 hover:text-white text-xs font-medium rounded-lg border border-indigo-500/40 transition-colors disabled:opacity-50"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span>{exporting === 'html' ? 'Descargando...' : 'HTML'}</span>
          </button>
        </div>
      </div>

      {/* Content */}
      {report ? (
        <div className="mt-4 space-y-4">
          {/* Summary Text Narrative */}
          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80 text-xs text-slate-300 leading-relaxed whitespace-pre-line font-mono">
            {report.summary_text}
          </div>

          {/* Quick Metrics from Report */}
          <div className="grid grid-cols-3 gap-3 pt-2">
            <div className="p-3 bg-slate-950/40 rounded-lg border border-slate-800/60 text-center">
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Sismos Evaluados</div>
              <div className="text-base font-bold text-white mt-0.5">{report.total_earthquakes}</div>
            </div>
            <div className="p-3 bg-slate-950/40 rounded-lg border border-slate-800/60 text-center">
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Magnitud Máxima</div>
              <div className="text-base font-bold text-amber-400 mt-0.5">{report.max_magnitude} Mw</div>
            </div>
            <div className="p-3 bg-slate-950/40 rounded-lg border border-slate-800/60 text-center">
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Anomalías Detectadas</div>
              <div className="text-base font-bold text-rose-400 mt-0.5">{report.anomalies_detected}</div>
            </div>
          </div>
        </div>
      ) : (
        <div className="py-8 text-center text-xs text-slate-500">
          No hay reportes de IA generados aún en `curated.ai_reports`. Puedes disparar el DAG diario desde el panel admin o ejecutar el bootstrap.
        </div>
      )}
    </div>
  );
};

