import React, { useState } from 'react';
import { useAuth, PRESET_CREDENTIALS } from '../context/AuthContext';
import {
  Shield,
  User,
  Lock,
  Activity,
  ArrowRight,
  AlertCircle,
  X,
  KeyRound,
} from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
  const { login, quickLogin, authError } = useAuth();
  const [username, setUsername] = useState('viewer');
  const [password, setPassword] = useState('-D5x4648Zh-EJsYBqhAp74-b6wk');
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setLocalError(null);
    try {
      await login(username, password);
      onClose();
    } catch (err: any) {
      setLocalError(err.message || 'Credenciales de acceso no válidas.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (role: 'admin' | 'viewer') => {
    setLoading(true);
    setLocalError(null);
    try {
      await quickLogin(role);
      onClose();
    } catch (err: any) {
      setLocalError(err.message || 'Error al autenticar perfil.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 z-[9990] bg-black/80 backdrop-blur-md transition-opacity animate-in fade-in duration-200"
      />

      {/* Modal Dialog */}
      <div className="fixed inset-0 z-[9991] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-[#0c1220] border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl relative animate-in zoom-in-95 duration-200">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 mb-3 shadow-[0_0_20px_rgba(59,130,246,0.3)]">
              <Activity className="w-6 h-6 animate-pulse" />
            </div>
            <h2 className="text-xl font-bold text-white font-sans tracking-tight">
              Acceso a la Consola
            </h2>
            <p className="text-xs font-mono text-slate-400 mt-1">
              Control de Acceso Basado en Roles (RBAC) &bull; JWT HS256
            </p>
          </div>

          {/* Error Message */}
          {(localError || authError) && (
            <div className="mb-5 p-3 rounded-xl bg-rose-950/60 border border-rose-800/80 flex items-start gap-2.5 text-xs text-rose-300 font-mono">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{localError || authError}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-mono uppercase text-slate-400 mb-1.5">
                Usuario
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-500" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  placeholder="admin o viewer"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#070b14] border border-slate-800 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-slate-400 mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#070b14] border border-slate-800 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-[0.99] text-white font-medium text-sm transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <span>Validando Credenciales...</span>
              ) : (
                <>
                  <span>Ingresar a la Plataforma</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* 1-Click Evaluation Shortcuts */}
          <div className="mt-6 pt-5 border-t border-slate-800/80">
            <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-2.5 text-center flex items-center justify-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-amber-400" />
              <span>Perfiles para Evaluación Rápida</span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => handleQuickLogin('admin')}
                disabled={loading}
                className="p-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-left transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <div className="text-xs font-bold text-rose-300 font-mono flex items-center justify-between">
                  <span>ADMIN</span>
                  <span className="text-[9px] bg-rose-500/20 text-rose-300 px-1 py-0.5 rounded">Auditor</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-1 leading-tight font-sans">
                  Cuarentena, triggers Airflow y linaje
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('viewer')}
                disabled={loading}
                className="p-2.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-left transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <div className="text-xs font-bold text-blue-300 font-mono flex items-center justify-between">
                  <span>VIEWER</span>
                  <span className="text-[9px] bg-blue-500/20 text-blue-300 px-1 py-0.5 rounded">Analista</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-1 leading-tight font-sans">
                  Mapa táctico, feeds, charts y reportes
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
