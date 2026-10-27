import React, { useState } from 'react';
import { AiReport } from '../types';
import { api } from '../services/api';
import { Bot, CheckCircle2, Cpu, Sparkles, Download, Printer } from 'lucide-react';

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
    if (provider === 'groq') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-mono font-medium bg-[#241a2e] text-[#d5c4fb] border border-[#4a365f]/50">
          <Cpu className="w-3 h-3 text-[#d5c4fb]" /> Groq (gpt-oss-120b)
        </span>
      );
    }
    if (provider === 'gemini') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-mono font-medium bg-[#241a2e] text-[#d5c4fb] border border-[#4a365f]/50">
          <Sparkles className="w-3 h-3 text-[#d5c4fb]" /> Gemini Flash
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-mono font-medium bg-[#201a18] text-[#ececf1] border border-[#332b27]">
        <Bot className="w-3 h-3" /> Motor Determinista
      </span>
    );
  };

  if (loading && !report) {
    return (
      <div className="h-64 bg-[#171211] rounded-2xl border border-[#261f1c] animate-pulse p-6" />
    );
  }

  return (
    <div className="bg-[#171211] border border-[#261f1c] rounded-2xl p-5 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#261f1c]">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#241a2e] text-[#d5c4fb] rounded-xl border border-[#4a365f]/40">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-mono font-semibold text-[#f7f7f9] tracking-wider uppercase">
                Boletín Ejecutivo Generado por IA
              </h3>
              {report?.validation_passed && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-mono font-medium bg-[#14231b] text-[#86efac] border border-[#234231]/60">
                  <CheckCircle2 className="w-3 h-3" /> CERO ALUCINACIONES AUDITADO
                </span>
              )}
            </div>
            <p className="text-[11px] text-[#9b9baa] font-mono">
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
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1f1715] hover:bg-[#281e1b] text-[#ececf1] text-xs font-mono font-medium rounded-xl border border-[#2b211e] transition-colors disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{exporting === 'csv' ? 'Exportando...' : 'CSV'}</span>
          </button>
          <button
            onClick={() => handleExport('html')}
            disabled={exporting !== null}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#844dea] hover:bg-[#9f73f2] text-white text-xs font-mono font-medium rounded-xl transition-colors disabled:opacity-50 shadow-sm"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>{exporting === 'html' ? 'Exportando...' : 'Imprimir / PDF'}</span>
          </button>
        </div>
      </div>

      {/* Content */}
      {report ? (
        <div className="space-y-4 font-mono">
          {/* Micro KPIs Grid from report */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 bg-[#120e0d] rounded-xl border border-[#241c19]">
              <span className="text-[10px] text-[#9b9baa] uppercase">Sismos Analizados</span>
              <div className="text-base font-bold text-[#f7f7f9] mt-0.5">{report.total_earthquakes}</div>
            </div>
            <div className="p-3 bg-[#120e0d] rounded-xl border border-[#241c19]">
              <span className="text-[10px] text-[#9b9baa] uppercase">Magnitud Máxima</span>
              <div className="text-base font-bold text-[#fb923c] mt-0.5">{report.max_magnitude} Mw</div>
            </div>
            <div className="p-3 bg-[#120e0d] rounded-xl border border-[#241c19]">
              <span className="text-[10px] text-[#9b9baa] uppercase">Anomalías Detectadas</span>
              <div className="text-base font-bold text-[#fde047] mt-0.5">{report.anomalies_detected}</div>
            </div>
            <div className="p-3 bg-[#120e0d] rounded-xl border border-[#241c19]">
              <span className="text-[10px] text-[#9b9baa] uppercase">Modelo Evaluador</span>
              <div className="text-xs font-semibold text-[#ececf1] mt-1 truncate">{report.model_name || report.provider}</div>
            </div>
          </div>

          {/* Narrative Summary */}
          <div className="p-4 bg-[#120e0d] rounded-xl border border-[#241c19] text-xs text-[#ececf1] leading-relaxed font-sans whitespace-pre-line">
            {report.summary_text}
          </div>

          <div className="flex items-center justify-between text-[10px] text-[#9b9baa] pt-2 border-t border-[#241c19]">
            <span>Fecha del Reporte: {report.report_date}</span>
            <span>Generado: {new Date(report.created_at).toLocaleString()}</span>
          </div>
        </div>
      ) : (
        <div className="p-8 text-center text-xs font-mono text-[#9b9baa]">
          No hay informe ejecutivo disponible para el ciclo actual. El DAG `dag_reporte_ia_anomalias` se ejecuta a las 00:00 UTC.
        </div>
      )}
    </div>
  );
};
