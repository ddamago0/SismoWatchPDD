import React, { useState } from 'react';
import { api } from '../services/api';
import { SqlQueryResult } from '../types';
import { Sparkles, X, Send, Database, AlertCircle, Terminal, HelpCircle } from 'lucide-react';

interface AiQueryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AiQueryModal: React.FC<AiQueryModalProps> = ({ isOpen, onClose }) => {
  const [queryText, setQueryText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SqlQueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const suggestedQuestions = [
    '¿Cuáles son los 5 sismos de mayor magnitud registrados?',
    '¿Cuántos sismos con alerta de tsunami existen?',
    'Top regiones con mayor cantidad de eventos',
    'Promedio general de magnitud y profundidad',
    'SELECT id, mag, place, time FROM curated.earthquakes_curated LIMIT 5',
  ];

  const handleExecute = async (textToRun: string) => {
    if (!textToRun.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await api.runNaturalQuery(textToRun);
      setResult(res);
    } catch (err: any) {
      setError(err.message || 'Error al ejecutar la consulta');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleExecute(queryText);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 text-indigo-400 rounded-xl border border-indigo-500/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Asistente Analítico IA (Bono Text-to-SQL + AST Guard)
              </h3>
              <p className="text-xs text-slate-400">
                Consulta en lenguaje natural o SQL directo. Protegido estrictamente contra sentencias DDL/DML.
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

        {/* Query Input */}
        <div className="p-5 overflow-y-auto space-y-4">
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="relative">
              <input
                type="text"
                value={queryText}
                onChange={(e) => setQueryText(e.target.value)}
                placeholder="Escribe tu pregunta en español o una consulta SELECT..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-4 pr-24 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
              <button
                type="submit"
                disabled={loading || !queryText.trim()}
                className="absolute right-2 top-2 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{loading ? 'Consultando...' : 'Consultar'}</span>
              </button>
            </div>
          </form>

          {/* Suggestions */}
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 mb-2">
              <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
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
                  className="px-2.5 py-1 bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 text-xs rounded-lg border border-slate-700/60 transition-colors text-left"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Política de Seguridad Bloqueante:</span> {error}
              </div>
            </div>
          )}

          {/* Results */}
          {result && (
            <div className="space-y-3 pt-2">
              {/* Executed SQL info */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs font-mono">
                <div className="flex items-center gap-1.5 text-slate-400 font-semibold mb-1 text-[11px] uppercase tracking-wider">
                  <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                  <span>SQL Validado & Sanitizado por AST:</span>
                </div>
                <div className="text-emerald-300 overflow-x-auto p-2 bg-slate-900/60 rounded border border-slate-800/60">
                  {result.executed_sql}
                </div>
                <div className="text-slate-400 text-[10px] mt-1.5">
                  Filas retornadas: <span className="font-bold text-white">{result.row_count}</span>
                </div>
              </div>

              {/* Data Table */}
              <div className="overflow-x-auto rounded-xl border border-slate-800 max-h-64">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-[10px] uppercase font-bold text-slate-400 sticky top-0 border-b border-slate-800">
                    <tr>
                      {result.columns.map((col, idx) => (
                        <th key={idx} className="px-3 py-2">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 bg-slate-950/40">
                    {result.data.length === 0 ? (
                      <tr>
                        <td colSpan={result.columns.length} className="px-3 py-6 text-center text-slate-500">
                          Sin registros para los criterios especificados.
                        </td>
                      </tr>
                    ) : (
                      result.data.map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-slate-800/30">
                          {result.columns.map((col, cIdx) => (
                            <td key={cIdx} className="px-3 py-2 font-mono text-[11px] text-slate-200">
                              {row[col] !== null && row[col] !== undefined ? String(row[col]) : '—'}
                            </td>
                          ))}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

