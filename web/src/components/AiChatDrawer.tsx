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
        className="fixed inset-0 z-[9998] bg-black/75 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
      />

      {/* Lateral Slide-Over Drawer */}
      <div className="fixed top-0 right-0 bottom-0 w-full sm:w-[560px] z-[9999] bg-[#090e1a] border-l border-slate-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200 select-none">
        {/* Drawer Header */}
        <div className="p-4 bg-[#060911] border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600/20 text-blue-400 rounded-xl border border-blue-500/30">
              <Bot className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white tracking-tight">
                  SismoBot &bull; Asistente Analítico
                </h3>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  AST GUARD
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono">
                Text-to-SQL y Resúmenes Ejecutivos sobre Medallion Curated
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleClearChat}
              title="Limpiar conversación"
              className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              title="Cerrar cajón"
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
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
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border shadow-md ${
                    isUser
                      ? 'bg-blue-600/20 text-blue-300 border-blue-500/30'
                      : 'bg-indigo-600/20 text-indigo-300 border-indigo-500/30'
                  }`}
                >
                  {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>

                {/* Message Bubble Container */}
                <div className={`max-w-[85%] space-y-1.5 ${isUser ? 'items-end' : 'items-start'}`}>
                  {/* Bubble */}
                  <div
                    className={`p-3.5 rounded-2xl text-xs ${
                      isUser
                        ? 'bg-blue-600 text-white rounded-tr-none shadow-lg'
                        : 'bg-[#0f172a] border border-slate-800 text-slate-200 rounded-tl-none shadow-md'
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
                      <div className="mt-3 pt-2.5 border-t border-slate-800/80">
                        <button
                          onClick={() => toggleSqlView(msg.id)}
                          className="flex items-center gap-1.5 text-[10px] font-mono text-blue-400 hover:text-blue-300 font-bold transition-colors"
                        >
                          <Terminal className="w-3 h-3" />
                          <span>
                            {showSqlFor[msg.id] ? 'Ocultar SQL Auditado' : 'Ver SQL Auditado (AST)'}
                          </span>
                          {showSqlFor[msg.id] ? (
                            <ChevronUp className="w-3 h-3" />
                          ) : (
                            <ChevronDown className="w-3 h-3" />
                          )}
                        </button>

                        {showSqlFor[msg.id] && (
                          <div className="mt-2 p-2.5 bg-[#05080f] rounded-xl border border-slate-800">
                            <div className="flex items-center justify-between text-[9px] font-mono text-slate-400 mb-1">
                              <span className="text-emerald-400 font-bold">PostgreSQL 16 &bull; Solo Lectura</span>
                              <span>{msg.row_count} fila(s)</span>
                            </div>
                            <pre className="text-[10px] font-mono text-emerald-400 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                              {msg.executed_sql}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Metadata Footer */}
                  <div className={`flex items-center gap-2 px-1 text-[9px] font-mono text-slate-500 ${isUser ? 'justify-end' : 'justify-start'}`}>
                    <span>{msg.timestamp}</span>
                    {msg.provider_used && (
                      <>
                        <span>&bull;</span>
                        <span className="text-slate-400">{msg.provider_used}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Thinking Indicator */}
          {loading && (
            <div className="flex gap-3 items-start">
              <div className="w-8 h-8 rounded-xl bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 animate-spin" />
              </div>
              <div className="p-3.5 rounded-2xl rounded-tl-none bg-[#0f172a] border border-slate-800 text-xs text-slate-300 flex items-center gap-2.5 shadow-md">
                <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                <span className="font-mono text-[11px]">SismoBot está analizando los datos sismológicos...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Queries Chips Bar */}
        <div className="p-2.5 bg-[#070b14] border-t border-slate-800/80">
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400 mb-1.5 px-1 font-bold">
            <HelpCircle className="w-3 h-3 text-blue-400" />
            <span>Consultas frecuentes sugeridas:</span>
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {SUGGESTED_PROMPTS.map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => sendMessage(prompt)}
                disabled={loading}
                className="px-2.5 py-1 rounded-lg text-[10px] font-mono bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700 whitespace-nowrap shrink-0 transition-all disabled:opacity-50"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSubmit} className="p-3 bg-[#060911] border-t border-slate-800 flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={loading}
            placeholder="Pregunta en lenguaje natural o escribe un SELECT..."
            className="flex-grow px-3.5 py-2.5 rounded-xl bg-[#0b1220] border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono disabled:opacity-50"
          />

          <button
            type="submit"
            disabled={loading || !inputText.trim()}
            className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/30 transition-all disabled:opacity-40 disabled:hover:bg-blue-600 shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </>
  );
};
