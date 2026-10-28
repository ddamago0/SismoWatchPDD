import React, { useState, useEffect } from 'react';
import { AiReport } from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Bot,
  Download,
  Printer,
  RefreshCw,
} from 'lucide-react';

interface AiReportCardProps {
  report: AiReport | null;
  loading: boolean;
}

// Helper para renderizar negritas inline sin asteriscos
function renderInlineFormatting(content: string) {
  if (!content) return null;
  const clean = content.replace(/\*\*\*/g, '**');
  const parts = clean.split(/(\*\*.*?\*\*|`.*?`)/g);

  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      const boldText = part.slice(2, -2).replace(/^"+|"+$/g, '').trim();
      return (
        <strong key={idx} className="font-semibold text-[#f7f7f9]">
          {boldText}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      return (
        <code key={idx} className="px-1.5 py-0.5 rounded bg-[#100d0c] text-[#d5c4fb] font-mono text-[11px] border border-[#2d2421]">
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

interface ReportBlock {
  type: 'header' | 'bullet' | 'number' | 'paragraph';
  num?: string;
  text: string;
}

function parseExecutiveReportBlocks(rawText: string): ReportBlock[] {
  if (!rawText) return [];

  // Eliminar cualquier emoji Unicode (directriz: "no pongas nada de emojis")
  const strippedText = rawText
    .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\uFE0F]/gu, '')
    .replace(/\*\*"([^"]+)"\*\*/g, '**$1**')
    .replace(/""/g, '"');

  const lines = strippedText.split('\n');
  const blocks: ReportBlock[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Omitir cabecera H1 redundante o avisos de contingencia técnica
    if (
      line.startsWith('# Reporte Ejecutivo') ||
      line.toLowerCase().includes('motor determinístico') ||
      line.toLowerCase().includes('contingencia de sismowatch') ||
      line.toLowerCase().includes('validator.py')
    ) {
      continue;
    }
    if (/^[-*_]{3,}$/.test(line)) {
      continue;
    }

    // Encabezados de sección (## o ###)
    if (line.startsWith('## ') || line.startsWith('### ')) {
      const headerText = line.replace(/^#{2,3}\s+/, '').replace(/\*\*/g, '');
      blocks.push({ type: 'header', text: headerText });
      continue;
    }

    // Encabezados estilo **Título:**
    if (line.startsWith('**') && (line.endsWith('**') || line.endsWith('**:')) && line.length < 60) {
      const headerText = line.replace(/^\*\*|\*\*[:]?$/g, '');
      blocks.push({ type: 'header', text: headerText });
      continue;
    }

    // Viñetas (- o * o •)
    if (line.startsWith('- ') || line.startsWith('* ') || line.startsWith('• ')) {
      const bulletText = line.replace(/^[-*•]\s+/, '');
      blocks.push({ type: 'bullet', text: bulletText });
      continue;
    }

    // Pasos numerados (1. 2. 3.)
    const numMatch = line.match(/^(\d+)\.\s+(.*)/);
    if (numMatch) {
      blocks.push({ type: 'number', num: numMatch[1], text: numMatch[2] });
      continue;
    }

    // Párrafo estándar
    blocks.push({ type: 'paragraph', text: line });
  }

  return blocks;
}

const ExecutiveReportRenderer: React.FC<{ text: string }> = ({ text }) => {
  const blocks = parseExecutiveReportBlocks(text);

  return (
    <div className="space-y-3">
      {blocks.map((block, idx) => {
        if (block.type === 'header') {
          return (
            <div key={idx} className="flex items-center gap-2.5 pt-4 pb-1.5 border-b border-[#261f1c] first:pt-0">
              <div className="w-1.5 h-4 bg-gradient-to-b from-[#844dea] to-[#a855f7] rounded-full shrink-0" />
              <h4 className="text-xs font-semibold tracking-wider text-[#f7f7f9] uppercase font-mono">
                {block.text}
              </h4>
            </div>
          );
        }

        if (block.type === 'bullet') {
          return (
            <div key={idx} className="flex items-start gap-2.5 pl-1 py-1 text-xs text-[#cfcfdc]">
              <div className="w-1.5 h-1.5 rounded-full bg-[#844dea] mt-1.5 shrink-0" />
              <div className="flex-1 leading-relaxed">
                {renderInlineFormatting(block.text)}
              </div>
            </div>
          );
        }

        if (block.type === 'number') {
          return (
            <div key={idx} className="flex items-start gap-3 pl-1 py-1.5 text-xs text-[#cfcfdc]">
              <span className="w-5 h-5 rounded-md bg-[#241a2e] text-[#d5c4fb] border border-[#4a365f]/50 flex items-center justify-center font-mono text-[10px] font-bold shrink-0 mt-0.5">
                {block.num}
              </span>
              <div className="flex-1 leading-relaxed">
                {renderInlineFormatting(block.text)}
              </div>
            </div>
          );
        }

        return (
          <p key={idx} className="text-xs text-[#cfcfdc] leading-relaxed py-1 font-sans">
            {renderInlineFormatting(block.text)}
          </p>
        );
      })}
    </div>
  );
};

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
      setRegenFeedback('Evaluación ejecutiva actualizada en Airflow');
      setTimeout(() => {
        fetchReportForWindow(activeWindow);
        setRegenFeedback(null);
      }, 3500);
    } catch (err: any) {
      setRegenFeedback(`Error: ${err.message || 'Fallo al disparar evaluación'}`);
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

  // Nivel de riesgo según magnitud máxima
  const maxMag = currentReport?.max_magnitude || 0;
  const isHighRisk = maxMag >= 6.0;
  const isModerateRisk = maxMag >= 4.5;

  return (
    <div className="bg-[#171211] border border-[#261f1c] rounded-2xl p-5 shadow-sm space-y-4">
      {/* Header and Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#261f1c]">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#241a2e] text-[#d5c4fb] rounded-xl border border-[#4a365f]/40">
            <Bot className="w-5 h-5 text-[#844dea]" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[#f7f7f9] tracking-wide">
              Boletín Ejecutivo Sísmico
            </h3>
            <p className="text-xs text-[#9b9baa]">
              Síntesis técnica de actividad geofísica y evaluación de riesgo operacional
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
              <span>{regenerating ? 'Evaluando...' : 'Regenerar On-Demand'}</span>
            </button>
          )}

          {/* Export Buttons */}
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
        <div className="space-y-4">
          {/* Micro KPIs Grid from report */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 bg-[#120e0d] rounded-xl border border-[#241c19]">
              <span className="text-[10px] text-[#9b9baa] uppercase tracking-wider font-semibold">Sismos Monitoreados</span>
              <div className="text-base font-bold text-[#f7f7f9] mt-0.5">{currentReport.total_earthquakes}</div>
            </div>
            <div className="p-3 bg-[#120e0d] rounded-xl border border-[#241c19]">
              <span className="text-[10px] text-[#9b9baa] uppercase tracking-wider font-semibold">Magnitud Máxima</span>
              <div className="text-base font-bold text-[#fb923c] mt-0.5">{currentReport.max_magnitude} Mw</div>
            </div>
            <div className="p-3 bg-[#120e0d] rounded-xl border border-[#241c19]">
              <span className="text-[10px] text-[#9b9baa] uppercase tracking-wider font-semibold">Alertas de Tsunami</span>
              <div className="text-base font-bold text-[#86efac] mt-0.5">
                {(currentReport.tsunami_alerts_count || 0) > 0 ? `${currentReport.tsunami_alerts_count} Activas` : '0 (Seguro)'}
              </div>
            </div>
            <div className="p-3 bg-[#120e0d] rounded-xl border border-[#241c19]">
              <span className="text-[10px] text-[#9b9baa] uppercase tracking-wider font-semibold">Nivel de Riesgo Global</span>
              <div className="flex items-center gap-1.5 mt-1">
                <span className={`w-2 h-2 rounded-full ${
                  isHighRisk ? 'bg-[#f87171] animate-pulse' : isModerateRisk ? 'bg-[#fb923c]' : 'bg-[#86efac]'
                }`} />
                <span className={`text-xs font-semibold ${
                  isHighRisk ? 'text-[#f87171]' : isModerateRisk ? 'text-[#fb923c]' : 'text-[#86efac]'
                }`}>
                  {isHighRisk ? 'Alto / Crítico' : isModerateRisk ? 'Moderado' : 'Estable (Verde)'}
                </span>
              </div>
            </div>
          </div>

          {/* Narrative Summary with Executive Formatting */}
          <div className="p-5 bg-[#120e0d] rounded-xl border border-[#241c19] shadow-inner">
            <ExecutiveReportRenderer text={currentReport.summary_text} />
          </div>

          <div className="flex items-center justify-between text-[11px] text-[#9b9baa] pt-2 border-t border-[#241c19] font-mono">
            <span>Ventana de Análisis: {activeWindow === '24h' ? 'Últimas 24 Horas' : activeWindow === '7d' ? 'Últimos 7 Días' : 'Últimos 30 Días'}</span>
            <span>Fecha del Reporte: {currentReport.report_date} &bull; Sincronizado: {new Date(currentReport.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
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
