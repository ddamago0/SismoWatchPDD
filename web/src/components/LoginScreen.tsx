import React, { useState } from 'react';
import { useAuth, PRESET_CREDENTIALS } from '../context/AuthContext';
import {
  Activity,
  Shield,
  Layers,
  Lock,
  User,
  Eye,
  EyeOff,
  AlertCircle,
  Database,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';

export const LoginScreen: React.FC = () => {
  const { login } = useAuth();
  const [selectedRole, setSelectedRole] = useState<'viewer' | 'admin'>('viewer');
  const [username, setUsername] = useState(PRESET_CREDENTIALS.viewer.username);
  const [password, setPassword] = useState(PRESET_CREDENTIALS.viewer.password);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSelectRole = (role: 'viewer' | 'admin') => {
    setSelectedRole(role);
    setUsername(PRESET_CREDENTIALS[role].username);
    setPassword(PRESET_CREDENTIALS[role].password);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(username, password);
    } catch (err: any) {
      setError(err.message || 'Error de autenticación. Verifica las credenciales.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#060a12] text-slate-100 flex items-center justify-center p-4 sm:p-6 font-sans">
      <div className="w-full max-w-4xl bg-[#0b121e] border border-slate-800 rounded-3xl shadow-2xl overflow-hidden grid grid-cols-1 md:grid-cols-12">
        {/* Left Column: Technical Identity & Specifications (5 cols) */}
        <div className="md:col-span-5 bg-gradient-to-br from-[#0c1524] to-[#070d18] p-8 border-b md:border-b-0 md:border-r border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 bg-rose-600/20 text-rose-500 rounded-2xl border border-rose-500/30">
                <Activity className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h1 className="text-xl font-black text-white tracking-tight">SismoWatch</h1>
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-rose-400">
                  SuperApp PDD
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed mb-6 font-mono">
              Consola de observabilidad, mitigación y alerta sísmica bajo arquitectura Medallion.
            </p>

            {/* Architecture Highlights */}
            <div className="space-y-3 font-mono text-[11px]">
              <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
                <Layers className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-slate-200">Arquitectura Medallion</div>
                  <div className="text-slate-500 text-[10px]">Bronze (Crudo) &bull; Silver &bull; Gold Certificado</div>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
                <Shield className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-slate-200">Calidad & Cuarentena</div>
                  <div className="text-slate-500 text-[10px]">Pandera Gate bloqueante con segregación RBAC</div>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
                <Database className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-slate-200">Seguridad Mínimo Privilegio</div>
                  <div className="text-slate-500 text-[10px]">Sin sesión activa no se expone ningún dato</div>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-6 mt-6 border-t border-slate-800/80 text-[10px] font-mono text-slate-600">
            PostgreSQL 16 &bull; Airflow 2.8.1 &bull; FastAPI &bull; React
          </div>
        </div>

        {/* Right Column: Dynamic Authentication Form (7 cols) */}
        <div className="md:col-span-7 p-8 sm:p-10 flex flex-col justify-center bg-[#0e1626]">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-white tracking-tight">Acceso a la Plataforma</h2>
            <p className="text-xs text-slate-400 mt-1">
              Selecciona el perfil de usuario para ingresar al entorno operativo:
            </p>
          </div>

          {/* Role Switcher Tabs */}
          <div className="grid grid-cols-2 gap-2 mb-6 p-1 bg-slate-950 rounded-2xl border border-slate-800">
            <button
              type="button"
              onClick={() => handleSelectRole('viewer')}
              className={`py-2 px-3 rounded-xl text-xs font-mono font-bold transition-all flex items-center justify-center gap-1.5 ${
                selectedRole === 'viewer'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Viewer (Analista)</span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectRole('admin')}
              className={`py-2 px-3 rounded-xl text-xs font-mono font-bold transition-all flex items-center justify-center gap-1.5 ${
                selectedRole === 'admin'
                  ? 'bg-rose-600 text-white shadow-lg'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Admin (Auditor)</span>
            </button>
          </div>

          {/* Scope details for the selected role */}
          <div className="mb-6 p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-[11px] font-mono">
            <div className="text-slate-400 mb-1 font-bold">
              Alcance del perfil {selectedRole === 'viewer' ? 'VIEWER' : 'ADMIN'}:
            </div>
            <ul className="text-slate-400 space-y-1 text-[10px]">
              {selectedRole === 'viewer' ? (
                <>
                  <li className="flex items-center gap-1.5 text-slate-300">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Dashboard, mapa georreferenciado y gráficos en vivo.
                  </li>
                  <li className="flex items-center gap-1.5 text-slate-300">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Consulta de reportes y Asistente IA Text-to-SQL.
                  </li>
                  <li className="flex items-center gap-1.5 text-slate-400">
                    <span className="text-rose-400 font-bold">&times;</span> Sin acceso a cuarentena ni ejecución de pipelines.
                  </li>
                </>
              ) : (
                <>
                  <li className="flex items-center gap-1.5 text-slate-300">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Todas las capacidades operativas de Viewer.
                  </li>
                  <li className="flex items-center gap-1.5 text-slate-300">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Auditoría e inspección de registros en Cuarentena.
                  </li>
                  <li className="flex items-center gap-1.5 text-slate-300">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Disparadores manuales de Airflow e historial de linaje.
                  </li>
                </>
              )}
            </ul>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 mb-4 bg-rose-950/40 border border-rose-800/60 rounded-xl text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-mono font-medium text-slate-400 mb-1">
                Usuario
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono font-medium text-slate-400 mb-1">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-9 py-2 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
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
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-mono font-bold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
            >
              <span>{loading ? 'Validando credenciales...' : 'Iniciar Sesión'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
