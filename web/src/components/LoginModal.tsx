import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Activity,
  ArrowRight,
  AlertCircle,
  X,
  User,
  Lock,
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
        className="fixed inset-0 z-[9990] bg-[#0c0a09]/80 backdrop-blur-sm transition-opacity duration-200"
      />

      {/* Modal Dialog */}
      <div className="fixed inset-0 z-[9991] flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-[#161211] border border-[#2c2320] rounded-2xl p-6 shadow-2xl relative select-none animate-in zoom-in-95 duration-150">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1 rounded-lg text-[#9b9baa] hover:text-[#f7f7f9] hover:bg-[#201a18] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Header */}
          <div className="flex flex-col items-center text-center mb-5">
            <div className="w-10 h-10 rounded-xl bg-[#241a2e] border border-[#4a365f]/50 flex items-center justify-center text-[#d5c4fb] mb-2.5">
              <Activity className="w-5 h-5 animate-pulse" />
            </div>
            <h2 className="text-base font-semibold text-[#f7f7f9] tracking-tight">
              Acceso a la Consola
            </h2>
            <p className="text-[10px] font-mono text-[#9b9baa] mt-0.5">
              Control de Acceso Basado en Roles (RBAC) &bull; JWT
            </p>
          </div>

          {/* Error Message */}
          {(localError || authError) && (
            <div className="mb-4 p-2.5 rounded-xl bg-[#291418] border border-[#521b25] flex items-start gap-2 text-xs text-[#fca5a5] font-mono">
              <AlertCircle className="w-3.5 h-3.5 text-[#f87171] shrink-0 mt-0.5" />
              <span className="leading-tight">{localError || authError}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-[10px] font-mono uppercase text-[#9b9baa] mb-1">
                Usuario
              </label>
              <div className="relative">
                <User className="w-3.5 h-3.5 absolute left-3 top-3 text-[#737384]" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  placeholder="admin o viewer"
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#110e0d] border border-[#28201d] text-xs text-[#ececf1] placeholder-[#5c4d47] focus:outline-none focus:border-[#844dea] font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-mono uppercase text-[#9b9baa] mb-1">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="w-3.5 h-3.5 absolute left-3 top-3 text-[#737384]" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#110e0d] border border-[#28201d] text-xs text-[#ececf1] placeholder-[#5c4d47] focus:outline-none focus:border-[#844dea] font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-[#844dea] hover:bg-[#9f73f2] active:scale-[0.99] text-white font-medium text-xs transition-all shadow-md flex items-center justify-center gap-1.5 disabled:opacity-50 mt-1"
            >
              {loading ? (
                <span>Validando...</span>
              ) : (
                <>
                  <span>Ingresar a la Plataforma</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          {/* 1-Click Evaluation Shortcuts */}
          <div className="mt-4 pt-4 border-t border-[#241c19]">
            <div className="text-[10px] font-mono uppercase tracking-wider text-[#9b9baa] mb-2 text-center flex items-center justify-center gap-1">
              <KeyRound className="w-3 h-3 text-[#d5c4fb]" />
              <span>Atajos de Evaluación</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('admin')}
                disabled={loading}
                className="p-2 rounded-xl bg-[#20181b] hover:bg-[#2b1f24] border border-[#3f2732] text-left transition-all"
              >
                <div className="text-[11px] font-semibold text-[#fca5a5] font-mono flex items-center justify-between">
                  <span>ADMIN</span>
                  <span className="text-[9px] bg-[#3f2732] text-[#fca5a5] px-1 rounded">Auditor</span>
                </div>
                <div className="text-[9px] text-[#9b9baa] mt-0.5 font-sans leading-tight">
                  Cuarentena y control
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('viewer')}
                disabled={loading}
                className="p-2 rounded-xl bg-[#1a1727] hover:bg-[#221e33] border border-[#3b3252] text-left transition-all"
              >
                <div className="text-[11px] font-semibold text-[#d5c4fb] font-mono flex items-center justify-between">
                  <span>VIEWER</span>
                  <span className="text-[9px] bg-[#3b3252] text-[#d5c4fb] px-1 rounded">Analista</span>
                </div>
                <div className="text-[9px] text-[#9b9baa] mt-0.5 font-sans leading-tight">
                  Lectura operativa
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
