import React from 'react';
import {
  Activity,
  LogIn,
  Layers,
  ShieldCheck,
  Compass,
  Sparkles,
  Server,
  ArrowRight,
  Database,
  CheckCircle2,
} from 'lucide-react';

interface HomePageProps {
  onOpenLogin: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onOpenLogin }) => {
  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col font-sans select-none">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-[#070b14]/90 backdrop-blur-md border-b border-slate-800/80 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600/20 text-blue-400 rounded-xl border border-blue-500/30">
              <Activity className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg text-white tracking-tight">SismoWatch</span>
                <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full border border-slate-700 font-mono font-bold">
                  v2.4
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono">
                Consola de Inteligencia Sísmica & Medallion Lakehouse
              </p>
            </div>
          </div>

          <button
            onClick={onOpenLogin}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <LogIn className="w-4 h-4" />
            <span>Iniciar Sesión</span>
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-20 pb-16 px-6 overflow-hidden flex-grow flex items-center">
        {/* Subtle Ambient Backing Glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[650px] h-[350px] bg-blue-900/15 rounded-full blur-[140px] pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center relative z-10 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-700/80 text-xs font-mono text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>SuperApp &bull; Prueba de Desempeño Ruta IA & Automatización</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.15]">
            Observabilidad Sísmica y Gobernanza Medallion
          </h1>

          <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Plataforma de ingeniería de datos para ingestión continua USGS FDSN, validación de calidad determinística con Pandera, detección espacial de enjambres y boletines analíticos con IA verificada.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <button
              onClick={onOpenLogin}
              className="px-6 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold shadow-xl shadow-blue-600/25 flex items-center gap-2.5 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <span>Acceder a la Consola</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <a
              href="#arquitectura"
              className="px-5 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 text-sm font-medium transition-all"
            >
              Arquitectura del Sistema
            </a>
          </div>
        </div>
      </section>

      {/* Technical Architecture Pillars */}
      <section id="arquitectura" className="py-16 px-6 bg-[#05080f] border-t border-slate-800/80">
        <div className="max-w-6xl mx-auto space-y-10">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Pilares de Ingeniería y Arquitectura
            </h2>
            <p className="text-xs sm:text-sm font-mono text-slate-400 max-w-xl mx-auto">
              Implementación estricta de estándares de industria para pipelines de misión crítica
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Pillar 1 */}
            <div className="p-5 rounded-2xl bg-[#090e1a] border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-blue-600/15 border border-blue-500/30 flex items-center justify-center text-blue-400 mb-4">
                  <Layers className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-white mb-2">Arquitectura Medallion</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Segregación física en esquemas Bronze (<code className="text-slate-300">raw</code>), Silver (<code className="text-slate-300">staging</code>) y Gold (<code className="text-slate-300">curated</code>) en PostgreSQL 16 con roles RBAC de mínimo privilegio.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] font-mono text-blue-400">
                Idempotencia Garantizada
              </div>
            </div>

            {/* Pillar 2 */}
            <div className="p-5 rounded-2xl bg-[#090e1a] border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-emerald-600/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-4">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-white mb-2">Quality Gate Pandera</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  7 reglas determinísticas (ISO/IEC 25012) que verifican coordenadas [-90,90], rangos de magnitud y frescura, aislando anomalías en cuarentena sin pérdida de datos.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] font-mono text-emerald-400">
                Aislamiento en Cuarentena
              </div>
            </div>

            {/* Pillar 3 */}
            <div className="p-5 rounded-2xl bg-[#090e1a] border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-purple-600/15 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-4">
                  <Compass className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-white mb-2">Clustering Haversine</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Detección espacial de enjambres sísmicos calculando distancias geodésicas sobre la esfera terrestre (R = 6371 km) para clusters de al menos 3 eventos en 2 horas.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] font-mono text-purple-400">
                Geometría Esférica Pura
              </div>
            </div>

            {/* Pillar 4 */}
            <div className="p-5 rounded-2xl bg-[#090e1a] border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-amber-600/15 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4">
                  <Sparkles className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-white mb-2">IA Anti-Alucinaciones</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Cascada de LLMs (Gemini &rarr; Groq &rarr; Fallback) con validador determinístico por expresiones regulares y asistente analítico Text-to-SQL blindado con AST.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] font-mono text-amber-400">
                Verificación Numérica Cero Error
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* System Infrastructure Live Status */}
      <section className="py-8 px-6 bg-[#070b14] border-t border-slate-800/80">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4 text-xs font-mono text-slate-400">
          <div className="flex items-center gap-6 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>PostgreSQL 16 (Medallion)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Apache Airflow 2.8.1 (Scheduler & DAGs)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>FastAPI SSE Real-Time Stream</span>
            </div>
          </div>

          <div>
            <span>OWASP ASVS 4.0 &bull; JWT HS256 &bull; RBAC</span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 px-6 bg-[#05080f] border-t border-slate-800/80 text-center text-xs font-mono text-slate-400">
        <div>
          SismoWatch &copy; 2026 &bull; SuperApp Prueba de Desempeño
        </div>
      </footer>
    </div>
  );
};
