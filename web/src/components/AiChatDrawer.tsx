import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { SqlQueryResult, DeclarativeChart } from '../types';
import {
  Sparkles,
  X,
  Send,
  Terminal,
  ShieldCheck,
  HelpCircle,
  Database,
  AlertCircle,
  CheckCircle2,
  Table as TableIcon,
  Bot,
  User,
  Trash2,
  ChevronDown,
  ChevronUp,
  Waves,
  Cpu,
  Loader2,
  Compass,
  Flame,
  FileText,
  TrendingUp,
  Clock,
  ArrowRight,
  BarChart2,
} from 'lucide-react';

interface AiChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: string;
  data?: Record<string, any>[];
  columns?: string[];
  executed_sql?: string | null;
  row_count?: number;
  provider_used?: string;
  status?: string;
  latency_ms?: number;
  suggested_questions?: string[];
  chart?: DeclarativeChart;
}

interface WelcomeSuggestion {
  id: string;
  icon: React.ElementType;
  title: string;
  description: string;
  query: string;
}

const WELCOME_SUGGESTIONS: WelcomeSuggestion[] = [
  {
    id: 'location',
    icon: Compass,
    title: 'Actividad por ubicación',
    description: 'Identifica regiones y zonas geográficas con mayor o menor frecuencia de eventos.',
    query: '¿Cuáles son las regiones con mayor y menor actividad sísmica registrada en el sistema?',
  },
  {
    id: 'magnitude',
    icon: Flame,
    title: 'Sismos de mayor magnitud',
    description: 'Consulta los eventos más significativos registrados y alertas asociadas.',
    query: '¿Cuáles han sido los sismos de mayor magnitud registrados y qué características tuvieron?',
  },
  {
    id: 'summary24h',
    icon: FileText,
    title: 'Resumen de 24 horas',
    description: 'Genera una síntesis ejecutiva de la actividad consolidada en el último día.',
    query: 'Genera un reporte ejecutivo de la actividad sísmica de las últimas 24 horas.',
  },
  {
    id: 'trends',
    icon: TrendingUp,
    title: 'Tendencias y anomalías',
    description: 'Analiza patrones de profundidad y desviaciones estadísticas Z-Score.',
    query: '¿Qué tendencias o anomalías estadísticas Z-Score se han detectado en los registros?',
  },
];

const SUGGESTED_PROMPTS = [
  '¿Cuál fue el sismo más fuerte en las últimas 48 horas?',
  'Top 5 sismos de mayor magnitud registrados',
  '¿Cuántos sismos con alerta de tsunami existen?',
  'Top regiones con mayor actividad sísmica',
  'Promedio general de magnitud y profundidad',
  '¿Cuál es el estado de calidad de datos Pandera?',
  '¿Cómo funciona la arquitectura Medallion?',
  'SELECT id, mag, place, time FROM curated.earthquakes_curated ORDER BY mag DESC LIMIT 5',
];

const INITIAL_GREETING: ChatMessage = {
  id: 'greeting',
  sender: 'bot',
  text: '¡Hola! Soy **SismoBot**, el copiloto analítico de SismoWatch. Puedo consultar sismos en tiempo real, alertas de tsunami, análisis de enjambres espaciotemporales y el estado del Lakehouse Medallion. ¿Qué deseas consultar hoy?',
  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  provider_used: 'SismoBot Core',
};

// ==========================================
// PARSERS DE MARKDOWN ESTRUCTURADO (TABLAS, CITAS, LISTAS)
// ==========================================

type ParsedBlock =
  | { type: 'h1' | 'h2' | 'h3'; text: string }
  | { type: 'table'; headers: string[]; rows: string[][] }
  | { type: 'blockquote'; text: string }
  | { type: 'bullet'; text: string }
  | { type: 'number'; num: string; text: string }
  | { type: 'hr' }
  | { type: 'paragraph'; text: string };

const isTableRow = (line: string): boolean => {
  if (!line) return false;
  const trimmed = line.trim();
  return trimmed.includes('|') && trimmed.replace(/^\||\|$/g, '').split('|').length > 1;
};

const isSeparatorRow = (line: string): boolean => {
  if (!line) return false;
  const cells = line.trim().replace(/^\||\|$/g, '').split('|');
  return cells.length > 1 && cells.every((c) => /^:?-+:?$/.test(c.trim()));
};

const splitTableRow = (rowStr: string): string[] => {
  let s = rowStr.trim();
  if (s.startsWith('|')) s = s.slice(1);
  if (s.endsWith('|')) s = s.slice(0, -1);
  return s.split('|').map((c) => c.trim());
};

const parseMarkdownBlocks = (rawText: string): ParsedBlock[] => {
  if (!rawText) return [];
  const lines = rawText.split('\n');
  const blocks: ParsedBlock[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line) {
      i++;
      continue;
    }

    // 1. Detección de Tabla Markdown (| Col1 | Col2 | + separador)
    if (isTableRow(line) && i + 1 < lines.length && isSeparatorRow(lines[i + 1])) {
      const headers = splitTableRow(line);
      i += 2; // saltar cabecera y separador
      const rows: string[][] = [];
      while (i < lines.length && isTableRow(lines[i]) && !isSeparatorRow(lines[i])) {
        rows.push(splitTableRow(lines[i]));
        i++;
      }
      blocks.push({ type: 'table', headers, rows });
      continue;
    }

    // 2. Blockquote / Cita
    if (line.startsWith('>')) {
      blocks.push({ type: 'blockquote', text: line.replace(/^>+\s*/, '') });
      i++;
      continue;
    }

    // 3. Regla horizontal
    if (/^[-*_]{3,}$/.test(line)) {
      blocks.push({ type: 'hr' });
      i++;
      continue;
    }

    // 4. Encabezados
    if (line.startsWith('### ')) {
      blocks.push({ type: 'h3', text: line.replace('### ', '') });
      i++;
      continue;
    }
    if (line.startsWith('## ')) {
      blocks.push({ type: 'h2', text: line.replace('## ', '') });
      i++;
      continue;
    }
    if (line.startsWith('# ')) {
      blocks.push({ type: 'h1', text: line.replace('# ', '') });
      i++;
      continue;
    }

    // 5. Línea envuelta completamente en negrita: **Título**
    if (line.startsWith('**') && (line.endsWith('**') || line.endsWith('**:'))) {
      const title = line.replace(/^\*\*|\*\*[:]?$/g, '');
      blocks.push({ type: 'h2', text: title });
      i++;
      continue;
    }

    // 6. Lista con viñeta
    if (line.startsWith('* ') || line.startsWith('- ') || line.startsWith('• ')) {
      blocks.push({ type: 'bullet', text: line.replace(/^[-*•]\s+/, '') });
      i++;
      continue;
    }

    // 7. Lista numerada
    const numMatch = line.match(/^(\d+)\.\s+(.*)/);
    if (numMatch) {
      blocks.push({ type: 'number', num: numMatch[1], text: numMatch[2] });
      i++;
      continue;
    }

    // 8. Párrafo estándar
    blocks.push({ type: 'paragraph', text: line });
    i++;
  }

  return blocks;
};

// Renderizador inline de negrita y bloques de código
function renderInlineFormatting(text: string) {
  if (!text) return null;
  const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);

  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      return (
        <strong key={index} className="font-semibold text-[#d5c4fb] bg-[#844dea]/15 px-1 py-0.5 rounded border border-[#844dea]/25">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      return (
        <code key={index} className="px-1.5 py-0.5 rounded bg-[#100d0c] text-[#86efac] font-mono text-[11px] border border-[#241c19]">
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

// Formateador completo con soporte de Tablas, Títulos y Citas
function FormattedReply({ text }: { text: string }) {
  if (!text) return null;
  const blocks = parseMarkdownBlocks(text);

  return (
    <div className="space-y-2.5 text-xs text-[#ececf1] leading-relaxed">
      {blocks.map((block, idx) => {
        if (block.type === 'table') {
          return (
            <div key={idx} className="my-3 overflow-x-auto rounded-xl border border-[#2d2421] bg-[#0c0a09] shadow-inner">
              <table className="w-full text-left text-[11px] font-mono border-collapse">
                <thead className="bg-[#171211] border-b border-[#2d2421] text-[#9b9baa] font-semibold uppercase text-[9px] tracking-wider">
                  <tr>
                    {block.headers.map((h, hIdx) => (
                      <th key={hIdx} className="py-2 px-3 whitespace-nowrap">
                        {renderInlineFormatting(h)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#241c19] text-[#ececf1]">
                  {block.rows.map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-[#1a1413] transition-colors">
                      {row.map((cell, cIdx) => (
                        <td key={cIdx} className="py-1.5 px-3 whitespace-nowrap text-[11px]">
                          {renderInlineFormatting(cell)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }

        if (block.type === 'h1') {
          return (
            <h2 key={idx} className="text-sm font-bold text-[#f7f7f9] mt-3 mb-1.5 pb-1 border-b border-[#28201d]">
              {renderInlineFormatting(block.text)}
            </h2>
          );
        }

        if (block.type === 'h2') {
          return (
            <h3 key={idx} className="text-xs font-bold text-[#d5c4fb] mt-2.5 mb-1">
              {renderInlineFormatting(block.text)}
            </h3>
          );
        }

        if (block.type === 'h3') {
          return (
            <h4 key={idx} className="text-[11px] font-semibold text-[#a8a29e] mt-2 mb-0.5">
              {renderInlineFormatting(block.text)}
            </h4>
          );
        }

        if (block.type === 'blockquote') {
          return (
            <div key={idx} className="my-2 p-2.5 rounded-lg bg-[#241a2e]/40 border-l-3 border-[#844dea] text-xs text-[#d5c4fb] leading-relaxed">
              {renderInlineFormatting(block.text)}
            </div>
          );
        }

        if (block.type === 'hr') {
          return <hr key={idx} className="my-3 border-[#28201d]" />;
        }

        if (block.type === 'bullet') {
          return (
            <div key={idx} className="flex items-start gap-2 pl-1 py-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#844dea] mt-1.5 shrink-0" />
              <div className="flex-1 text-xs text-[#ececf1] leading-relaxed">
                {renderInlineFormatting(block.text)}
              </div>
            </div>
          );
        }

        if (block.type === 'number') {
          return (
            <div key={idx} className="flex items-start gap-2 pl-1 py-0.5">
              <span className="font-mono text-[11px] font-bold text-[#844dea] shrink-0 mt-0.5">{block.num}.</span>
              <div className="flex-1 text-xs text-[#ececf1] leading-relaxed">
                {renderInlineFormatting(block.text)}
              </div>
            </div>
          );
        }

        return (
          <p key={idx} className="text-xs text-[#ececf1] leading-relaxed">
            {renderInlineFormatting(block.text)}
          </p>
        );
      })}
    </div>
  );
}

// Data table component for SQL results
function ResultDataTable({
  columns,
  data,
}: {
  columns: string[];
  data: Record<string, any>[];
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const displayRows = isExpanded ? data : data.slice(0, 5);

  const formatCellValue = (col: string, val: any) => {
    if (val === null || val === undefined) return '—';
    if (col === 'mag' && typeof val === 'number') {
      const color =
        val >= 6.0
          ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
          : val >= 4.5
          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
          : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      return (
        <span className={`px-1.5 py-0.5 rounded font-mono font-bold border text-[10px] ${color}`}>
          {val.toFixed(1)} Mw
        </span>
      );
    }
    if (col === 'tsunami') {
      return val === 1 ? (
        <span className="px-1.5 py-0.5 rounded font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] flex items-center gap-1">
          <Waves className="w-3 h-3" />
          ALERTA
        </span>
      ) : (
        <span className="text-slate-500">0</span>
      );
    }
    if (col === 'time' && typeof val === 'string') {
      try {
        return new Date(val).toLocaleString([], {
          month: 'short',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        });
      } catch {
        return val;
      }
    }
    if (typeof val === 'number') {
      return Number.isInteger(val) ? val.toLocaleString() : val.toFixed(2);
    }
    return String(val);
  };

  return (
    <div className="mt-3 rounded-xl border border-slate-800 bg-[#070b14] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-[11px] font-mono">
          <thead className="bg-[#0c1220] text-slate-400 uppercase text-[9px] tracking-wider border-b border-slate-800">
            <tr>
              {columns.map((col) => (
                <th key={col} className="px-3 py-2 whitespace-nowrap">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {displayRows.map((row, idx) => (
              <tr key={idx} className="hover:bg-slate-900/60 transition-colors">
                {columns.map((col) => (
                  <td key={col} className="px-3 py-1.5 whitespace-nowrap text-slate-300">
                    {formatCellValue(col, row[col])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data.length > 5 && (
        <div className="p-1.5 bg-[#0a0f1d] border-t border-slate-800 text-center">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-[10px] font-mono text-blue-400 hover:text-blue-300 font-bold transition-colors cursor-pointer"
          >
            {isExpanded ? 'Mostrar menos filas' : `Ver todas las ${data.length} filas...`}
          </button>
        </div>
      )}
    </div>
  );
}

// Visualizador de Gráficos Declarativos (ADR 0008)
function DeclarativeChartRenderer({ chart }: { chart: DeclarativeChart }) {
  if (!chart || chart.type === 'none' || !chart.labels || !chart.datasets || chart.datasets.length === 0) {
    return null;
  }

  const dataset = chart.datasets[0];
  const data = dataset.data || [];
  const maxVal = Math.max(...data, 1);
  const colors = dataset.backgroundColor || ['#844dea', '#a855f7', '#c084fc', '#60a5fa', '#38bdf8'];

  return (
    <div className="mt-3 p-3 rounded-xl border border-[#2d2421] bg-[#0c0a09] shadow-inner space-y-2.5">
      <div className="flex items-center justify-between border-b border-[#241c19] pb-2">
        <div className="flex items-center gap-1.5">
          <BarChart2 className="w-3.5 h-3.5 text-[#844dea]" />
          <h4 className="text-[11px] font-bold text-[#f7f7f9] tracking-tight">{chart.title}</h4>
        </div>
        <span className="text-[9px] font-mono text-[#a8a29e] bg-[#1a1413] px-2 py-0.5 rounded border border-[#241c19]">
          {dataset.label || 'Valores'}
        </span>
      </div>

      {/* Renderizado de Tipo Barras */}
      {chart.type === 'bar' && (
        <div className="space-y-2 pt-1">
          {chart.labels.map((lbl, idx) => {
            const val = data[idx] ?? 0;
            const pct = Math.round((val / maxVal) * 100);
            const color = colors[idx % colors.length];

            return (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between text-[10px] font-mono">
                  <span className="text-[#ececf1] truncate max-w-[70%]">{lbl}</span>
                  <span className="font-bold text-[#d5c4fb]">{val.toLocaleString()}</span>
                </div>
                <div className="w-full h-2 rounded-full bg-[#171211] overflow-hidden border border-[#241c19]">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.max(pct, 4)}%`,
                      backgroundColor: color,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Renderizado de Tipo Línea / Serie Temporal SVG */}
      {chart.type === 'line' && (
        <div className="pt-2">
          <div className="h-28 w-full flex items-end gap-1 px-1">
            {chart.labels.map((lbl, idx) => {
              const val = data[idx] ?? 0;
              const heightPct = Math.round((val / maxVal) * 100);
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-1 group relative">
                  <div className="opacity-0 group-hover:opacity-100 absolute -top-5 px-1 py-0.5 rounded bg-[#201a18] text-[9px] font-mono text-white border border-[#382f2c] pointer-events-none transition-opacity z-10 whitespace-nowrap">
                    {lbl}: {val}
                  </div>
                  <div
                    className="w-full rounded-t transition-all duration-500 hover:brightness-125"
                    style={{
                      height: `${Math.max(heightPct, 8)}%`,
                      backgroundColor: '#844dea',
                    }}
                  />
                  {idx % Math.ceil(chart.labels.length / 6) === 0 && (
                    <span className="text-[8px] font-mono text-[#78716c] truncate w-full text-center">
                      {lbl}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Renderizado de Donut / Desglose */}
      {(chart.type === 'doughnut' || chart.type === 'pie') && (
        <div className="space-y-2 pt-1">
          <div className="flex h-3 w-full rounded-full overflow-hidden border border-[#241c19]">
            {chart.labels.map((lbl, idx) => {
              const val = data[idx] ?? 0;
              const totalSum = data.reduce((a, b) => a + b, 0) || 1;
              const pct = Math.round((val / totalSum) * 100);
              const color = colors[idx % colors.length];
              return (
                <div
                  key={idx}
                  title={`${lbl}: ${val} (${pct}%)`}
                  className="h-full transition-all duration-300 hover:brightness-125"
                  style={{ width: `${pct}%`, backgroundColor: color }}
                />
              );
            })}
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            {chart.labels.map((lbl, idx) => {
              const val = data[idx] ?? 0;
              const color = colors[idx % colors.length];
              return (
                <div key={idx} className="flex items-center gap-1.5 text-[10px] font-mono text-[#a8a29e]">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                  <span>{lbl}: <strong className="text-[#ececf1]">{val}</strong></span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export const AiChatDrawer: React.FC<AiChatDrawerProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem('sismowatch_chat_history');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // Ignore parsing errors
    }
    return [INITIAL_GREETING];
  });
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSqlFor, setShowSqlFor] = useState<Record<string, boolean>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('sismowatch_chat_history', JSON.stringify(messages));
    } catch {
      // Storage safe
    }
  }, [messages]);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Auto-focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const toggleSqlView = (msgId: string) => {
    setShowSqlFor((prev) => ({ ...prev, [msgId]: !prev[msgId] }));
  };

  const handleClearChat = () => {
    setMessages([INITIAL_GREETING]);
    try {
      localStorage.removeItem('sismowatch_chat_history');
    } catch {
      // Ignore
    }
  };

  const sendMessage = async (textToSend: string) => {
    const query = textToSend.trim();
    if (!query || loading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setLoading(true);

    try {
      // Preparamos el historial conversacional (últimos 6 turnos)
      const historyPayload = messages
        .filter((m) => m.id !== 'greeting')
        .slice(-6)
        .map((m) => ({
          role: m.sender === 'user' ? 'user' : 'assistant',
          content: m.text,
        }));

      const res: SqlQueryResult = await api.runNaturalQuery(query, historyPayload);

      const botMessage: ChatMessage = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: res.reply || `Se ejecutó la consulta y se obtuvieron **${res.row_count || 0} registros** de la capa Curated.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        data: res.data || [],
        columns: res.columns || [],
        executed_sql: res.executed_sql,
        chart: res.chart,
        row_count: res.row_count || (res.data ? res.data.length : 0),
        provider_used: res.provider_used || 'Groq LLaMA / Gemini',
        status: res.status || 'success',
        latency_ms: res.latency_ms,
        suggested_questions: res.suggested_questions,
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (err: any) {
      const errorMessage: ChatMessage = {
        id: `bot-err-${Date.now()}`,
        sender: 'bot',
        text: `⚠️ **Error en la consulta**: ${err.message || 'No fue posible completar la petición con el asistente.'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        provider_used: 'Sistema de Seguridad',
        status: 'error',
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputText);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 z-[9998] bg-[#0c0a09]/75 backdrop-blur-sm transition-opacity duration-200"
      />

      {/* Lateral Slide-Over Drawer */}
      <div className="fixed top-0 right-0 bottom-0 w-full sm:w-[580px] z-[9999] bg-[#161211] border-l border-[#241c19] shadow-2xl flex flex-col animate-in slide-in-from-right duration-200 select-none">
        {/* Drawer Header */}
        <div className="p-3.5 bg-[#120e0d] border-b border-[#241c19] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#241a2e] text-[#d5c4fb] flex items-center justify-center border border-[#4a365f]/50">
              <Bot className="w-4 h-4 animate-pulse text-[#d5c4fb]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-semibold text-[#f7f7f9] tracking-tight">
                  SismoBot &bull; Asistente Analítico
                </h3>
                <span className="px-1.5 py-0.2 rounded text-[8px] font-mono font-bold uppercase bg-[#1e2e22] text-[#86efac] border border-[#2b5235]">
                  AST GUARD + OWASP
                </span>
              </div>
              <p className="text-[10px] text-[#9b9baa] font-mono">
                IA Conversacional, Hechos en Vivo y Text-to-SQL
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handleClearChat}
              title="Limpiar conversación"
              className="p-1.5 text-[#9b9baa] hover:text-[#f87171] rounded-lg hover:bg-[#201a18] transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onClose}
              title="Cerrar cajón"
              className="p-1.5 text-[#9b9baa] hover:text-[#f7f7f9] rounded-lg hover:bg-[#201a18] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Message Stream */}
        <div className="flex-grow overflow-y-auto p-4 space-y-4">
          {messages.map((msg) => {
            const isUser = msg.sender === 'user';

            return (
              <div
                key={msg.id}
                className={`flex gap-3 items-start ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {/* Avatar */}
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border ${
                    isUser
                      ? 'bg-[#844dea]/20 text-[#d5c4fb] border-[#844dea]/40'
                      : 'bg-[#241a2e] text-[#d5c4fb] border-[#4a365f]/50'
                  }`}
                >
                  {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                </div>

                {/* Message Bubble Container */}
                <div className={`max-w-[88%] space-y-1.5 ${isUser ? 'items-end' : 'items-start'}`}>
                  {/* Bubble */}
                  <div
                    className={`p-3.5 rounded-xl text-xs ${
                      isUser
                        ? 'bg-[#844dea] text-white rounded-tr-none shadow-sm'
                        : 'bg-[#1a1413] border border-[#28201d] text-[#ececf1] rounded-tl-none shadow-sm'
                    }`}
                  >
                    {isUser ? (
                      <p className="leading-relaxed font-medium">{msg.text}</p>
                    ) : (
                      <FormattedReply text={msg.text} />
                    )}

                    {/* Renderizado de Gráfico Declarativo (ADR 0008) */}
                    {!isUser && msg.chart && msg.chart.type && msg.chart.type !== 'none' && (
                      <DeclarativeChartRenderer chart={msg.chart} />
                    )}

                    {/* Data Table Preview if query returned rows */}
                    {!isUser && msg.data && msg.data.length > 0 && msg.columns && (
                      <ResultDataTable columns={msg.columns} data={msg.data} />
                    )}

                    {/* Collapsible SQL Audit Section */}
                    {!isUser && msg.executed_sql && (
                      <div className="mt-2.5 pt-2 border-t border-[#28201d]">
                        <button
                          onClick={() => toggleSqlView(msg.id)}
                          className="flex items-center gap-1.5 text-[10px] font-mono text-[#d5c4fb] hover:text-white font-medium transition-colors cursor-pointer"
                        >
                          <Terminal className="w-3 h-3" />
                          <span>
                            {showSqlFor[msg.id] ? 'Ocultar SQL' : 'Ver SQL Auditado (AST)'}
                          </span>
                          {showSqlFor[msg.id] ? (
                            <ChevronUp className="w-3 h-3" />
                          ) : (
                            <ChevronDown className="w-3 h-3" />
                          )}
                        </button>

                        {showSqlFor[msg.id] && (
                          <div className="mt-1.5 p-2 bg-[#100d0c] rounded-lg border border-[#241c19]">
                            <div className="flex items-center justify-between text-[9px] font-mono text-[#9b9baa] mb-1">
                              <span className="text-[#86efac] font-medium">PostgreSQL 16 &bull; Solo Lectura</span>
                              <span>{msg.row_count} fila(s)</span>
                            </div>
                            <pre className="text-[10px] font-mono text-[#86efac] overflow-x-auto whitespace-pre-wrap leading-relaxed">
                              {msg.executed_sql}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Suggested Follow-up Questions Pills */}
                    {!isUser && msg.suggested_questions && msg.suggested_questions.length > 0 && (
                      <div className="mt-3 pt-2.5 border-t border-[#28201d] space-y-1.5">
                        <div className="flex items-center gap-1 text-[9px] font-mono text-[#a8a29e]">
                          <HelpCircle className="w-3 h-3 text-[#844dea]" />
                          <span>Preguntas sugeridas de seguimiento:</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {msg.suggested_questions.map((q, qIdx) => (
                            <button
                              key={qIdx}
                              onClick={() => sendMessage(q)}
                              disabled={loading}
                              className="px-2.5 py-1 rounded-lg text-[10px] font-mono text-left bg-[#100d0c] hover:bg-[#201a18] text-[#d5c4fb] hover:text-white border border-[#2d2421] hover:border-[#844dea]/60 transition-all flex items-center gap-1.5 group cursor-pointer disabled:opacity-50"
                            >
                              <span>{q}</span>
                              <ArrowRight className="w-3 h-3 text-[#78716c] group-hover:text-[#d5c4fb] shrink-0" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Metadata Footer */}
                  <div className={`flex items-center gap-2 px-1 text-[9px] font-mono text-[#737384] ${isUser ? 'justify-end' : 'justify-start'}`}>
                    <span>{msg.timestamp}</span>
                    {msg.provider_used && (
                      <>
                        <span>&bull;</span>
                        <span className="text-[#9b9baa]">{msg.provider_used}</span>
                      </>
                    )}
                    {msg.latency_ms !== undefined && msg.latency_ms > 0 && (
                      <>
                        <span>&bull;</span>
                        <span className="text-[#86efac] flex items-center gap-0.5">
                          <Clock className="w-2.5 h-2.5" />
                          {msg.latency_ms}ms
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Tarjetas de Sugerencias Iniciales (Welcome Suggestions Grid) cuando el chat está limpio */}
          {messages.length <= 1 && (
            <div className="my-3 space-y-2 pt-2">
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#a8a29e] uppercase tracking-wider px-1">
                <Sparkles className="w-3.5 h-3.5 text-[#844dea]" />
                <span>Exploración asistida recomendada</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {WELCOME_SUGGESTIONS.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => sendMessage(item.query)}
                      disabled={loading}
                      className="text-left p-3 rounded-xl bg-[#1a1413] hover:bg-[#221a18] border border-[#28201d] hover:border-[#844dea]/50 transition-all group cursor-pointer disabled:opacity-50"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="w-7 h-7 rounded-lg bg-[#241a2e] text-[#d5c4fb] flex items-center justify-center border border-[#4a365f]/40 group-hover:bg-[#844dea] group-hover:text-white transition-colors">
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-[#5c4d47] group-hover:text-[#d5c4fb] group-hover:translate-x-0.5 transition-all" />
                      </div>
                      <h4 className="text-xs font-semibold text-[#f7f7f9] group-hover:text-[#d5c4fb] transition-colors">
                        {item.title}
                      </h4>
                      <p className="text-[10px] text-[#9b9baa] line-clamp-2 mt-0.5 leading-relaxed">
                        {item.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Thinking Indicator */}
          {loading && (
            <div className="flex gap-2.5 items-start">
              <div className="w-7 h-7 rounded-lg bg-[#241a2e] text-[#d5c4fb] border border-[#4a365f]/50 flex items-center justify-center shrink-0">
                <Bot className="w-3.5 h-3.5 animate-spin" />
              </div>
              <div className="p-3 rounded-xl rounded-tl-none bg-[#1a1413] border border-[#28201d] text-xs text-[#9b9baa] flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 text-[#d5c4fb] animate-spin" />
                <span className="font-mono text-[11px]">SismoBot analizando capa Curated...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Queries Chips Bar */}
        <div className="p-2 bg-[#120e0d] border-t border-[#241c19]">
          <div className="flex items-center gap-1 text-[9px] font-mono text-[#9b9baa] mb-1 px-1">
            <HelpCircle className="w-3 h-3 text-[#d5c4fb]" />
            <span>Consultas rápidas:</span>
          </div>
          <div className="flex gap-1 overflow-x-auto pb-0.5 scrollbar-none">
            {SUGGESTED_PROMPTS.map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => sendMessage(prompt)}
                disabled={loading}
                className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-[#171211] hover:bg-[#201a18] text-[#9b9baa] hover:text-[#f7f7f9] border border-[#241c19] hover:border-[#382f2c] whitespace-nowrap shrink-0 transition-all disabled:opacity-50 cursor-pointer"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSubmit} className="p-2.5 bg-[#120e0d] border-t border-[#241c19] flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={loading}
            placeholder="Pregunta en lenguaje natural o escribe un SELECT..."
            className="flex-grow px-3 py-2 rounded-lg bg-[#171211] border border-[#241c19] text-xs text-[#ececf1] placeholder-[#5c4d47] focus:outline-none focus:border-[#844dea] font-mono disabled:opacity-50"
          />

          <button
            type="submit"
            disabled={loading || !inputText.trim()}
            className="p-2 rounded-lg bg-[#844dea] hover:bg-[#9f73f2] text-white shadow-sm transition-all disabled:opacity-40 disabled:hover:bg-[#844dea] shrink-0 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </>
  );
};
