import React, { useState } from 'react';
import { useAuth, PRESET_CREDENTIALS } from '../context/AuthContext';
import { Shield, User, Lock, X, AlertCircle, Eye, EyeOff, CheckCircle } from 'lucide-react';

export const LoginModal: React.FC = () => {
  const { login, showLoginModal, setShowLoginModal, authError } = useAuth();
  const [username, setUsername] = useState('viewer');
  const [password, setPassword] = useState(PRESET_CREDENTIALS.viewer.password);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  if (!showLoginModal) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setLocalError(null);
    try {
      await login(username, password);
    } catch (err: any) {
      setLocalError(err.message || 'Credenciales inválidas');
    } finally {
      setLoading(false);
    }
  };

  const selectPreset = (role: 'viewer' | 'admin') => {
    const creds = PRESET_CREDENTIALS[role];
    setUsername(creds.username);
    setPassword(creds.password);
    setLocalError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-dark-900 border border-white/10 rounded-2xl shadow-2xl p-6 overflow-hidden">
        {/* Subtle accent glow */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-cobalt-500/10 blur-2xl pointer-events-none" />

        <button
          onClick={() => setShowLoginModal(false)}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-cobalt-500/10 text-cobalt-400 rounded-xl border border-cobalt-500/20">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">Acceso a la Consola</h2>
            <p className="text-xs text-slate-400 font-mono">Control de Acceso Basado en Roles (RBAC)</p>
          </div>
        </div>

        {(localError || authError) && (
          <div className="flex items-start gap-2.5 p-3 mb-4 bg-rose-950/40 border border-rose-800/60 rounded-xl text-rose-300 text-xs">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-400" />
            <span>{localError || authError}</span>
          </div>
        )}

        {/* Quick Role Selection Presets */}
        <div className="mb-5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
            Selección Rápida de Perfil para Evaluación:
          </span>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => selectPreset('viewer')}
              className={`p-2.5 rounded-xl border text-left transition-all ${
                username === 'viewer'
                  ? 'bg-cobalt-500/15 border-cobalt-500/50 text-white shadow-sm'
                  : 'bg-dark-850/60 border-white/5 text-slate-400 hover:border-white/10'
              }`}
            >
              <div className="text-xs font-bold text-white flex items-center justify-between">
                <span>Viewer</span>
                {username === 'viewer' && <CheckCircle className="w-3.5 h-3.5 text-cobalt-400" />}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Solo lectura & analítica</div>
            </button>

            <button
              type="button"
              onClick={() => selectPreset('admin')}
              className={`p-2.5 rounded-xl border text-left transition-all ${
                username === 'admin'
                  ? 'bg-coral-500/15 border-coral-500/50 text-white shadow-sm'
                  : 'bg-dark-850/60 border-white/5 text-slate-400 hover:border-white/10'
              }`}
            >
              <div className="text-xs font-bold text-white flex items-center justify-between">
                <span>Admin</span>
                {username === 'admin' && <CheckCircle className="w-3.5 h-3.5 text-coral-400" />}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Cuarentena & Airflow</div>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Usuario</label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full bg-dark-950 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-cobalt-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Contraseña</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-dark-950 border border-white/10 rounded-xl pl-9 pr-9 py-2 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-cobalt-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-cobalt-500 hover:bg-cobalt-600 text-white font-bold text-xs rounded-xl shadow-glow-cobalt transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
          >
            {loading ? 'Autenticando...' : 'Iniciar Sesión'}
          </button>
        </form>
      </div>
    </div>
  );
};
