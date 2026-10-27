import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { SqlQueryResult } from '../types';
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
}

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

// Formatter for rich text replies with bold and bullet points
function FormattedReply({ text }: { text: string }) {
  if (!text) return null;
  const lines = text.split('\n').filter((l) => l.trim().length > 0);

  const parseBold = (content: string) => {
    const parts = content.split(/\*\*(.*?)\*\*/g);
    return parts.map((part, index) => {
      if (index % 2 === 1) {
        return (
          <strong key={index} className="font-bold text-white bg-blue-500/10 px-1 py-0.5 rounded">
            {part}
          </strong>
        );
      }
      return part;
    });
  };

  return (
    <div className="space-y-2 leading-relaxed text-xs text-slate-200">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        const isBullet = trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.startsWith('• ');
        const cleanText = isBullet ? trimmed.replace(/^[-*•]\s+/, '') : trimmed;

        if (isBullet) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-1">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
              <span className="flex-1">{parseBold(cleanText)}</span>
            </div>
          );
        }

        return (
          <p key={idx} className="leading-relaxed">
            {parseBold(cleanText)}
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
            className="text-[10px] font-mono text-blue-400 hover:text-blue-300 font-bold transition-colors"
          >
            {isExpanded ? 'Mostrar menos filas' : `Ver todas las ${data.length} filas...`}
          </button>
        </div>
      )}
    </div>
  );
}

export const AiChatDrawer: React.FC<AiChatDrawerProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_GREETING]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSqlFor, setShowSqlFor] = useState<Record<string, boolean>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  if (!isOpen) return null;

  const toggleSqlView = (msgId: string) => {
    setShowSqlFor((prev) => ({ ...prev, [msgId]: !prev[msgId] }));
  };

  const handleClearChat = () => {
    setMessages([INITIAL_GREETING]);
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
      const res: SqlQueryResult = await api.runNaturalQuery(query);

      const botMessage: ChatMessage = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: res.reply || `Se ejecutó la consulta y se obtuvieron **${res.row_count || 0} registros** de la capa Curated.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        data: res.data || [],
        columns: res.columns || [],
        executed_sql: res.executed_sql,
        row_count: res.row_count || (res.data ? res.data.length : 0),
        provider_used: res.provider_used || 'Groq LLaMA / Gemini',
        status: res.status || 'success',
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
      <div className="fixed top-0 right-0 bottom-0 w-full sm:w-[560px] z-[9999] bg-[#161211] border-l border-[#241c19] shadow-2xl flex flex-col animate-in slide-in-from-right duration-200 select-none">
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
                  AST GUARD
                </span>
              </div>
              <p className="text-[10px] text-[#9b9baa] font-mono">
                Text-to-SQL y Resúmenes sobre Medallion Curated
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handleClearChat}
              title="Limpiar conversación"
              className="p-1.5 text-[#9b9baa] hover:text-[#f87171] rounded-lg hover:bg-[#201a18] transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onClose}
              title="Cerrar cajón"
              className="p-1.5 text-[#9b9baa] hover:text-[#f7f7f9] rounded-lg hover:bg-[#201a18] transition-colors"
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
                <div className={`max-w-[85%] space-y-1 ${isUser ? 'items-end' : 'items-start'}`}>
                  {/* Bubble */}
                  <div
                    className={`p-3 rounded-xl text-xs ${
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

                    {/* Data Table Preview if query returned rows */}
                    {!isUser && msg.data && msg.data.length > 0 && msg.columns && (
                      <ResultDataTable columns={msg.columns} data={msg.data} />
                    )}

                    {/* Collapsible SQL Audit Section */}
                    {!isUser && msg.executed_sql && (
                      <div className="mt-2.5 pt-2 border-t border-[#28201d]">
                        <button
                          onClick={() => toggleSqlView(msg.id)}
                          className="flex items-center gap-1.5 text-[10px] font-mono text-[#d5c4fb] hover:text-white font-medium transition-colors"
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
                  </div>
                </div>
              </div>
            );
          })}

          {/* Thinking Indicator */}
          {loading && (
            <div className="flex gap-2.5 items-start">
              <div className="w-7 h-7 rounded-lg bg-[#241a2e] text-[#d5c4fb] border border-[#4a365f]/50 flex items-center justify-center shrink-0">
                <Bot className="w-3.5 h-3.5 animate-spin" />
              </div>
              <div className="p-3 rounded-xl rounded-tl-none bg-[#1a1413] border border-[#28201d] text-xs text-[#9b9baa] flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 text-[#d5c4fb] animate-spin" />
                <span className="font-mono text-[11px]">Consultando capa Curated...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Queries Chips Bar */}
        <div className="p-2 bg-[#120e0d] border-t border-[#241c19]">
          <div className="flex items-center gap-1 text-[9px] font-mono text-[#9b9baa] mb-1 px-1">
            <HelpCircle className="w-3 h-3 text-[#d5c4fb]" />
            <span>Consultas sugeridas:</span>
          </div>
          <div className="flex gap-1 overflow-x-auto pb-0.5 scrollbar-none">
            {SUGGESTED_PROMPTS.map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => sendMessage(prompt)}
                disabled={loading}
                className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-[#171211] hover:bg-[#201a18] text-[#9b9baa] hover:text-[#f7f7f9] border border-[#241c19] hover:border-[#382f2c] whitespace-nowrap shrink-0 transition-all disabled:opacity-50"
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
            className="p-2 rounded-lg bg-[#844dea] hover:bg-[#9f73f2] text-white shadow-sm transition-all disabled:opacity-40 disabled:hover:bg-[#844dea] shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </>
  );
};
