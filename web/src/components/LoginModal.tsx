import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, User, Lock, X, AlertCircle } from 'lucide-react';

export const LoginModal: React.FC = () => {
  const { login, showLoginModal, setShowLoginModal } = useAuth();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('9qwtK_dVjef-ex5qgrHnlJRr6u8');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!showLoginModal) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(username, password);
    } catch (err: any) {
      setError(err.message || 'Error al autenticar');
    } finally {
      setLoading(false);
    }
  };

  const setAdminDemo = () => {
    setUsername('admin');
    setPassword('9qwtK_dVjef-ex5qgrHnlJRr6u8');
  };

  const setViewerDemo = () => {
    setUsername('viewer');
    setPassword('-D5x4648Zh-EJsYBqhAp74-b6wk');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6">
        <button
          onClick={() => setShowLoginModal(false)}
          className="absolute top-4 right-4 text-slate-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="p-2.5 bg-indigo-600/20 text-indigo-400 rounded-xl border border-indigo-500/30">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Autenticación SismoWatch</h2>
            <p className="text-xs text-slate-400">Control de Acceso Basado en Roles (RBAC)</p>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 mb-4 bg-rose-950/40 border border-rose-800/60 rounded-lg text-rose-300 text-xs">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Usuario</label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Contraseña</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm rounded-lg transition-colors flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 disabled:opacity-50"
          >
            {loading ? 'Validando...' : 'Iniciar Sesión'}
          </button>
        </form>

        <div className="mt-5 pt-4 border-t border-slate-800">
          <p className="text-[11px] text-slate-400 mb-2 font-medium">Credenciales de prueba rápida (Sustentación):</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={setAdminDemo}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md text-[11px] text-indigo-300 transition-colors text-left"
            >
              <div className="font-semibold text-white">Rol Admin</div>
              <div className="text-[10px] text-slate-400">Acceso a Cuarentena & Triggers</div>
            </button>
            <button
              type="button"
              onClick={setViewerDemo}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md text-[11px] text-emerald-300 transition-colors text-left"
            >
              <div className="font-semibold text-white">Rol Viewer</div>
              <div className="text-[10px] text-slate-400">Solo lectura y KPIs</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
