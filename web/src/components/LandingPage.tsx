import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Activity,
  Shield,
  Layers,
  Sparkles,
  ArrowRight,
  Database,
  Lock,
  Cpu,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';

interface LandingPageProps {
  onOpenLogin: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onOpenLogin }) => {
  const { quickLogin } = useAuth();
  const [loadingRole, setLoadingRole] = useState<'admin' | 'viewer' | null>(null);

  const handleQuickAccess = async (role: 'admin' | 'viewer') => {
    setLoadingRole(role);
    try {
      await quickLogin(role);
    } catch (err) {
      console.error('Error during quick login', err);
    } finally {
      setLoadingRole(null);
    }
  };

  return (
    <div className="min-h-screen bg-dark-950 text-slate-100 flex flex-col justify-between relative overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-b from-cobalt-500/15 via-cobalt-600/5 to-transparent blur-3xl pointer-events-none" />

      {/* Top Header */}
      <header className="relative z-10 border-b border-white/5 bg-dark-950/60 backdrop-blur-md px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-tr from-coral-500 to-rose-600 rounded-xl shadow-glow-coral text-white">
              <Activity className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg tracking-tight text-white">SismoWatch</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest bg-coral-500/10 text-coral-400 border border-coral-500/20">
                  PDD SUPERAPP
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono">
                Arquitectura Medallion & IA Anti-Alucinación
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => handleQuickAccess('viewer')}
              disabled={loadingRole !== null}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-dark-800 hover:bg-dark-750 text-slate-200 border border-white/10 transition-colors disabled:opacity-50"
            >
              {loadingRole === 'viewer' ? 'Ingresando...' : 'Demo Viewer'}
            </button>
            <button
              onClick={onOpenLogin}
              className="px-4 py-1.5 rounded-lg text-xs font-bold bg-cobalt-500 hover:bg-cobalt-600 text-white shadow-glow-cobalt transition-all flex items-center gap-1.5"
            >
              <span>Acceder</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 py-12 flex-grow flex flex-col justify-center">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-slate-300 mb-6">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span>Monitoreo Global USGS en Tiempo Real (SSE + Airflow)</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white leading-tight sm:leading-none mb-6">
            Observabilidad Sísmica de Alta Fidelidad
          </h1>

          <p className="text-base sm:text-lg text-slate-400 leading-relaxed font-normal mb-8">
            Plataforma enterprise de ingestión en streaming, calidad de datos con cuarentena
            automatizada Pandera, clustering geodésico de enjambres y generación de informes
            ejecutivos protegidos por validación anti-alucinación.
          </p>

          {/* Quick Access Roles Call-to-Action */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => handleQuickAccess('viewer')}
              disabled={loadingRole !== null}
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-cobalt-500 hover:bg-cobalt-600 text-white font-bold text-sm shadow-glow-cobalt flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Activity className="w-4 h-4" />
              <span>{loadingRole === 'viewer' ? 'Conectando...' : 'Ingresar como Viewer (Analista)'}</span>
            </button>

            <button
              onClick={() => handleQuickAccess('admin')}
              disabled={loadingRole !== null}
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-dark-850 hover:bg-dark-800 text-slate-200 font-bold text-sm border border-white/10 flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Shield className="w-4 h-4 text-rose-400" />
              <span>{loadingRole === 'admin' ? 'Conectando...' : 'Ingresar como Admin (Auditoría)'}</span>
            </button>
          </div>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-8">
          <div className="glass-surface p-5 rounded-2xl hover:border-white/20 transition-all">
            <div className="p-2.5 bg-cobalt-500/10 text-cobalt-400 rounded-xl w-fit mb-3 border border-cobalt-500/20">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-white mb-1">Arquitectura Medallion</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Esquemas segregados Bronze, Silver y Gold con Ecuación de Conciliación Matemática y cero pérdida de registros.
            </p>
          </div>

          <div className="glass-surface p-5 rounded-2xl hover:border-white/20 transition-all">
            <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl w-fit mb-3 border border-emerald-500/20">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-white mb-1">Cuarentena Pandera</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Quality Gate bloqueante. Registros con coordenadas o magnitudes anómalas son desviados a aislamiento auditado.
            </p>
          </div>

          <div className="glass-surface p-5 rounded-2xl hover:border-white/20 transition-all">
            <div className="p-2.5 bg-coral-500/10 text-coral-400 rounded-xl w-fit mb-3 border border-coral-500/20">
              <Cpu className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-white mb-1">Clustering Haversine</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Detección de enjambres sísmicos (Swarm Events) calculando distancias geodésicas sobre una esfera terrestre (R = 6371 km).
            </p>
          </div>

          <div className="glass-surface p-5 rounded-2xl hover:border-white/20 transition-all">
            <div className="p-2.5 bg-violet-500/10 text-violet-400 rounded-xl w-fit mb-3 border border-violet-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-white mb-1">IA Cero-Alucinaciones</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Cascada Gemini + Groq con validador Regex numérico determinista y asistente Text-to-SQL protegido por AST.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 px-6 py-4 bg-dark-950/80 text-center text-xs text-slate-500 font-mono">
        SismoWatch PDD SuperApp &bull; PostgreSQL 16 &bull; Apache Airflow 2.8.1 &bull; FastAPI SSE &bull; React 18 Leaflet
      </footer>
    </div>
  );
};
