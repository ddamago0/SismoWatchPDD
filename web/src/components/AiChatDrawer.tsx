import React, { useState } from 'react';
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
  Table,
} from 'lucide-react';

interface AiChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AiChatDrawer: React.FC<AiChatDrawerProps> = ({ isOpen, onClose }) => {
  const { isAuthenticated } = useAuth();
  const [queryText, setQueryText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SqlQueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const suggestions = [
    '¿Cuál fue el sismo más fuerte en las últimas 48 horas?',
    '¿Cuáles son los 5 sismos de mayor magnitud registrados?',
    '¿Cuántos sismos con alerta de tsunami existen?',
    'Top regiones con mayor cantidad de eventos',
    'Promedio general de magnitud y profundidad',
    'SELECT id, mag, place, time FROM curated.earthquakes_curated ORDER BY mag DESC LIMIT 5',
  ];

  const handleExecute = async (promptToRun: string) => {
    if (!promptToRun.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await api.runNaturalQuery(promptToRun);
      setResult(res);
    } catch (err: any) {
      setError(err.message || 'Error al procesar la consulta analítica.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleExecute(queryText);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 z-[9998] bg-black/70 backdrop-blur-sm transition-opacity"
      />

      {/* Lateral Slide-Over Drawer */}
      <div className="fixed top-0 right-0 bottom-0 w-full sm:w-[520px] z-[9999] bg-[#0c1322] border-l border-slate-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="p-4 bg-[#080d18] border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600/20 text-blue-400 rounded-xl border border-blue-500/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white tracking-tight">
                  Asistente IA (Text-to-SQL)
                </h3>
                <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  READ ONLY AST
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono">
                Consultas en lenguaje natural blindadas contra sentencias DDL/DML
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="flex-grow overflow-y-auto p-4 space-y-4">
          {/* Suggestions List */}
          <div>
            <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-slate-400 mb-2">
              <HelpCircle className="w-3.5 h-3.5 text-blue-400" />
              <span>Consultas analíticas sugeridas:</span>
            </div>
            <div className="flex flex-col gap-1.5">
              {suggestions.map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setQueryText(s);
                    handleExecute(s);
                  }}
                  className="p-2 rounded-xl text-left text-xs font-mono bg-slate-900/90 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-slate-700 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-start gap-2.5 p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl text-rose-300 text-xs font-mono">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Results Display */}
          {result && (
            <div className="space-y-3 pt-2">
              {/* Generated SQL Audit */}
              <div className="p-3 bg-[#070b14] rounded-xl border border-slate-800">
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-1.5">
                  <div className="flex items-center gap-1 text-blue-400 font-bold">
                    <Terminal className="w-3.5 h-3.5" />
                    <span>SQL Auditado:</span>
                  </div>
                  <span className="text-emerald-400 font-bold">{result.row_count} filas</span>
                </div>
                <pre className="text-xs font-mono text-emerald-400 overflow-x-auto whitespace-pre-wrap">
                  {result.executed_sql}
                </pre>
              </div>

              {/* Data Table */}
              {result.data && result.data.length > 0 ? (
                <div className="overflow-x-auto rounded-xl border border-slate-800 bg-[#070b14]">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-slate-950 text-slate-400 text-[10px] uppercase tracking-wider border-b border-slate-800">
                      <tr>
                        {result.columns.map((col) => (
                          <th key={col} className="px-3 py-2 whitespace-nowrap">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850">
                      {result.data.map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-slate-800/30 transition-colors">
                          {result.columns.map((col) => (
                            <td key={col} className="px-3 py-2 text-slate-300 whitespace-nowrap">
                              {row[col] !== null && row[col] !== undefined ? String(row[col]) : '—'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-4 text-center text-xs font-mono text-slate-500">
                  No se encontraron filas que coincidan con la consulta.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Drawer Footer Input */}
        <div className="p-3 bg-[#080d18] border-t border-slate-800">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={queryText}
              onChange={(e) => setQueryText(e.target.value)}
              placeholder="Haz una pregunta o consulta SQL..."
              className="flex-grow bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
            <button
              type="submit"
              disabled={loading || !queryText.trim()}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-mono font-bold rounded-xl flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{loading ? '...' : 'Enviar'}</span>
            </button>
          </form>
        </div>
      </div>
    </>
  );
};

