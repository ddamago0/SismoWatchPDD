import React, { useState, useEffect } from 'react';
import { AiReport } from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Bot,
  CheckCircle2,
  Cpu,
  Sparkles,
  Download,
  Printer,
  RefreshCw,
  Clock,
  Calendar,
  AlertTriangle,
  Waves,
  ShieldCheck
} from 'lucide-react';

interface AiReportCardProps {
  report: AiReport | null;
  loading: boolean;
}

export const AiReportCard: React.FC<AiReportCardProps> = ({ report: initialReport, loading: initialLoading }) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [activeWindow, setActiveWindow] = useState<'24h' | '7d' | '30d'>('24h');
  const [currentReport, setCurrentReport] = useState<AiReport | null>(initialReport);
  const [loading, setLoading] = useState(initialLoading);
  const [exporting, setExporting] = useState<'csv' | 'html' | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [regenFeedback, setRegenFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (initialReport && activeWindow === '24h') {
      setCurrentReport(initialReport);
    }
  }, [initialReport, activeWindow]);

  const fetchReportForWindow = async (win: '24h' | '7d' | '30d') => {
    setActiveWindow(win);
    setLoading(true);
    try {
      const data = await api.getLatestReport(win);
      setCurrentReport(data);
    } catch (err: any) {
      console.error('Error fetching report for window:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerate = async () => {
    if (!isAdmin || regenerating) return;
    setRegenerating(true);
    setRegenFeedback(null);
    try {
      await api.regenerateReport();
      setRegenFeedback('DAG dag_reporte_ia_anomalias iniciado en Airflow exitosamente');
      setTimeout(() => {
        fetchReportForWindow(activeWindow);
        setRegenFeedback(null);
      }, 3500);
    } catch (err: any) {
      setRegenFeedback(`Error: ${err.message || 'Fallo al disparar DAG'}`);
    } finally {
      setRegenerating(false);
    }
  };

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
          <Cpu className="w-3 h-3 text-[#d5c4fb]" /> Groq (LLaMA 3.3 70B / 120B)
        </span>
      );
    }
    if (provider === 'gemini') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-mono font-medium bg-[#241a2e] text-[#d5c4fb] border border-[#4a365f]/50">
          <Sparkles className="w-3 h-3 text-[#d5c4fb]" /> Google Gemini Flash
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-mono font-medium bg-[#201a18] text-[#ececf1] border border-[#332b27]">
        <Bot className="w-3 h-3" /> Motor Determinista (ISO 25012)
      </span>
    );
  };

  const windowOptions: Array<{ id: '24h' | '7d' | '30d'; label: string }> = [
    { id: '24h', label: '24 Horas' },
    { id: '7d', label: '7 Días' },
    { id: '30d', label: '30 Días' },
  ];

  if (loading && !currentReport) {
    return (
      <div className="h-64 bg-[#171211] rounded-2xl border border-[#261f1c] animate-pulse p-6" />
    );
  }

  return (
    <div className="bg-[#171211] border border-[#261f1c] rounded-2xl p-5 shadow-sm space-y-4">
      {/* Header and Controls */}
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
              {currentReport?.validation_passed && (
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

        {/* Temporal Window Selector & Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Window Tabs (24h, 7d, 30d) */}
          <div className="flex items-center p-0.5 bg-[#120e0d] border border-[#241c19] rounded-xl">
            {windowOptions.map((opt) => (
              <button
                key={opt.id}
                onClick={() => fetchReportForWindow(opt.id)}
                className={`px-3 py-1.5 text-xs font-mono rounded-lg transition-all cursor-pointer ${
                  activeWindow === opt.id
                    ? 'bg-[#844dea] text-white shadow-sm font-semibold'
                    : 'text-[#9b9baa] hover:text-[#ececf1] hover:bg-[#1a1413]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Admin On-Demand Regeneration Button */}
          {isAdmin && (
            <button
              onClick={handleRegenerate}
              disabled={regenerating}
              title="Disparar re-evaluación del reporte en Apache Airflow"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1f1715] hover:bg-[#281e1b] text-[#d5c4fb] hover:text-white text-xs font-mono font-medium rounded-xl border border-[#2b211e] hover:border-[#844dea]/50 transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${regenerating ? 'animate-spin text-[#844dea]' : ''}`} />
              <span>{regenerating ? 'Disparando...' : 'Regenerar On-Demand'}</span>
            </button>
          )}

          {/* Export Buttons */}
          {currentReport && getProviderBadge(currentReport.provider)}
          <button
            onClick={() => handleExport('csv')}
            disabled={exporting !== null}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1f1715] hover:bg-[#281e1b] text-[#ececf1] text-xs font-mono font-medium rounded-xl border border-[#2b211e] transition-colors disabled:opacity-50 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{exporting === 'csv' ? 'Exportando...' : 'CSV'}</span>
          </button>
          <button
            onClick={() => handleExport('html')}
            disabled={exporting !== null}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#844dea] hover:bg-[#9f73f2] text-white text-xs font-mono font-medium rounded-xl transition-colors disabled:opacity-50 shadow-sm cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>{exporting === 'html' ? 'Exportando...' : 'Imprimir / PDF'}</span>
          </button>
        </div>
      </div>

      {/* Regeneration status feedback alert */}
      {regenFeedback && (
        <div className="p-3 bg-[#14231b] border border-[#234231] rounded-xl text-xs font-mono text-[#86efac] flex items-center justify-between animate-in fade-in">
          <span>{regenFeedback}</span>
          <span className="w-2 h-2 rounded-full bg-[#86efac] animate-pulse" />
        </div>
      )}

      {/* Content */}
      {currentReport ? (
        <div className="space-y-4 font-mono">
          {/* Micro KPIs Grid from report */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 bg-[#120e0d] rounded-xl border border-[#241c19]">
              <span className="text-[10px] text-[#9b9baa] uppercase">Sismos Analizados</span>
              <div className="text-base font-bold text-[#f7f7f9] mt-0.5">{currentReport.total_earthquakes}</div>
            </div>
            <div className="p-3 bg-[#120e0d] rounded-xl border border-[#241c19]">
              <span className="text-[10px] text-[#9b9baa] uppercase">Magnitud Máxima</span>
              <div className="text-base font-bold text-[#fb923c] mt-0.5">{currentReport.max_magnitude} Mw</div>
            </div>
            <div className="p-3 bg-[#120e0d] rounded-xl border border-[#241c19]">
              <span className="text-[10px] text-[#9b9baa] uppercase">Anomalías Detectadas</span>
              <div className="text-base font-bold text-[#fde047] mt-0.5">{currentReport.anomalies_detected}</div>
            </div>
            <div className="p-3 bg-[#120e0d] rounded-xl border border-[#241c19]">
              <span className="text-[10px] text-[#9b9baa] uppercase">Modelo Evaluador</span>
              <div className="text-xs font-semibold text-[#ececf1] mt-1 truncate">{currentReport.model_name || currentReport.provider}</div>
            </div>
          </div>

          {/* Narrative Summary */}
          <div className="p-4 bg-[#120e0d] rounded-xl border border-[#241c19] text-xs text-[#ececf1] leading-relaxed font-sans whitespace-pre-line">
            {currentReport.summary_text}
          </div>

          <div className="flex items-center justify-between text-[10px] text-[#9b9baa] pt-2 border-t border-[#241c19]">
            <span>Ventana de Análisis: {activeWindow === '24h' ? 'Últimas 24 Horas' : activeWindow === '7d' ? 'Últimos 7 Días' : 'Últimos 30 Días'}</span>
            <span>Fecha del Reporte: {currentReport.report_date} &bull; Generado: {new Date(currentReport.created_at).toLocaleString()}</span>
          </div>
        </div>
      ) : (
        <div className="p-8 text-center text-xs font-mono text-[#9b9baa]">
          No hay informe ejecutivo disponible para la ventana seleccionada ({activeWindow}).
        </div>
      )}
    </div>
  );
};
