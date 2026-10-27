import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { SqlQueryResult } from '../types';
import { Sparkles, X, Send, Database, AlertCircle, ShieldCheck, Terminal, HelpCircle } from 'lucide-react';

interface AiQueryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AiQueryModal: React.FC<AiQueryModalProps> = ({ isOpen, onClose }) => {
  const { isAuthenticated, setShowLoginModal } = useAuth();
  const [queryText, setQueryText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SqlQueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const suggestedQuestions = [
    '¿Cuál fue el sismo más fuerte en las últimas 48 horas?',
    '¿Cuáles son los 5 sismos de mayor magnitud registrados?',
    '¿Cuántos sismos con alerta de tsunami existen?',
    'Top regiones con mayor cantidad de eventos',
    'Promedio general de magnitud y profundidad',
    'SELECT id, mag, place, time FROM curated.earthquakes_curated ORDER BY mag DESC LIMIT 5',
  ];

  const handleExecute = async (textToRun: string) => {
    if (!textToRun.trim()) return;

    if (!isAuthenticated) {
      setError('Debes iniciar sesión para consultar el Asistente Analítico IA.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await api.runNaturalQuery(textToRun);
      setResult(res);
    } catch (err: any) {
      if (err.message && err.message.includes('SESION_REQUERIDA')) {
        setError('Tu sesión ha expirado o requiere autenticación. Por favor inicia sesión nuevamente.');
      } else {
        setError(err.message || 'Error al ejecutar la consulta analítica.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleExecute(queryText);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div className="relative w-full max-w-4xl bg-dark-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 bg-dark-950/80 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cobalt-500/10 text-cobalt-400 rounded-xl border border-cobalt-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white tracking-tight">
                  Asistente Analítico IA (Bono Text-to-SQL + AST Guard)
                </h3>
                <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  READ ONLY AST
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Consulta en lenguaje natural o SQL directo. Protegido estrictamente contra sentencias DDL/DML.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Query Input */}
        <div className="p-5 overflow-y-auto space-y-4">
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="relative">
              <input
                type="text"
                value={queryText}
                onChange={(e) => setQueryText(e.target.value)}
                placeholder="Escribe tu pregunta en español o una consulta SELECT..."
                className="w-full bg-dark-950 border border-white/10 rounded-xl pl-4 pr-28 py-3 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-cobalt-500"
              />
              <button
                type="submit"
                disabled={loading || !queryText.trim()}
                className="absolute right-2 top-2 px-4 py-1.5 bg-cobalt-500 hover:bg-cobalt-600 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-glow-cobalt transition-colors disabled:opacity-50"
              >
                <Send className="w-3 h-3" />
                <span>{loading ? 'Consultando...' : 'Consultar'}</span>
              </button>
            </div>
          </form>

          {/* Suggestions */}
          <div>
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 mb-2">
              <HelpCircle className="w-3.5 h-3.5 text-cobalt-400" />
              <span>Preguntas frecuentes sugeridas:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {suggestedQuestions.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setQueryText(q);
                    handleExecute(q);
                  }}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-mono bg-dark-850 hover:bg-dark-800 text-slate-300 border border-white/5 hover:border-white/15 transition-colors text-left"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center justify-between p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl text-rose-300 text-xs">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
              {!isAuthenticated && (
                <button
                  onClick={() => {
                    onClose();
                    setShowLoginModal(true);
                  }}
                  className="px-2.5 py-1 rounded bg-rose-800/60 hover:bg-rose-700/80 text-white text-[10px] font-bold uppercase tracking-wider transition-colors"
                >
                  Iniciar Sesión
                </button>
              )}
            </div>
          )}

          {/* Results Display */}
          {result && (
            <div className="space-y-3 mt-4 border-t border-white/10 pt-4">
              {/* Generated & Executed SQL */}
              <div className="p-3 bg-dark-950 rounded-xl border border-white/10">
                <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5">
                  <div className="flex items-center gap-1.5 text-cobalt-400 font-mono font-bold">
                    <Terminal className="w-3.5 h-3.5" />
                    <span>SQL Generado & Validado por AST Guard:</span>
                  </div>
                  <span className="font-mono text-emerald-400">{result.row_count} filas devueltas</span>
                </div>
                <pre className="text-xs font-mono text-emerald-400 overflow-x-auto whitespace-pre-wrap">
                  {result.executed_sql}
                </pre>
              </div>

              {/* Data Table */}
              {result.data && result.data.length > 0 ? (
                <div className="overflow-x-auto rounded-xl border border-white/10">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-dark-950 text-slate-400 text-[10px] uppercase tracking-wider border-b border-white/10">
                      <tr>
                        {result.columns.map((col) => (
                          <th key={col} className="px-3 py-2">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 bg-dark-900/60">
                      {result.data.map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-white/5 transition-colors">
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
                <div className="p-4 text-center text-xs text-slate-500 font-mono">
                  No se encontraron registros que coincidan con los criterios.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
