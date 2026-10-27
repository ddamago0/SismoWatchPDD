import React from 'react';
import {
  Activity,
  Layers,
  ShieldCheck,
  Compass,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

interface HomePageProps {
  onOpenLogin: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onOpenLogin }) => {
  return (
    <div className="min-h-screen bg-[#120e0d] text-[#ececf1] flex flex-col font-sans select-none">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-[#120e0d]/85 backdrop-blur-md border-b border-[#241c19] px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#241a2e] text-[#d5c4fb] flex items-center justify-center border border-[#4a365f]/50">
              <Activity className="w-4 h-4 animate-pulse text-[#d5c4fb]" />
            </div>
            <div>
              <span className="font-semibold text-sm text-[#f7f7f9] tracking-tight">SismoWatch</span>
              <p className="text-[10px] text-[#9b9baa] font-mono">
                Inteligencia Sísmica & Medallion Lakehouse
              </p>
            </div>
          </div>

          <button
            onClick={onOpenLogin}
            className="px-4 py-1.5 rounded-lg bg-[#844dea] hover:bg-[#9f73f2] text-white text-xs font-medium shadow-sm transition-all duration-200"
          >
            Acceder
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-24 pb-20 px-6 overflow-hidden flex-grow flex items-center">
        {/* Ambient Pale Lavender Glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[300px] bg-[#3a205a]/20 rounded-full blur-[140px] pointer-events-none" />

        <div className="max-w-3xl mx-auto text-center relative z-10 space-y-6">
          <h1 className="text-4xl sm:text-5xl font-medium text-[#f7f7f9] tracking-tight leading-[1.2]">
            Observabilidad Sísmica y Gobernanza Medallion
          </h1>

          <p className="text-sm sm:text-base text-[#9b9baa] max-w-xl mx-auto leading-relaxed">
            Ingestión continua USGS FDSN, calidad de datos automatizada con Pandera, detección espacial de enjambres y boletines analíticos con IA verificada.
          </p>

          <div className="flex items-center justify-center pt-2">
            <button
              onClick={onOpenLogin}
              className="px-6 py-2.5 rounded-xl bg-[#844dea] hover:bg-[#9f73f2] active:scale-[0.99] text-white text-xs font-semibold shadow-lg shadow-[#844dea]/20 flex items-center gap-2 transition-all duration-200"
            >
              <span>Acceder a la Consola</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </section>

      {/* Technical Architecture Pillars */}
      <section id="arquitectura" className="py-16 px-6 bg-[#0f0c0b] border-t border-[#201917]">
        <div className="max-w-5xl mx-auto space-y-10">
          <div className="text-center space-y-1.5">
            <h2 className="text-xl sm:text-2xl font-medium text-[#f7f7f9] tracking-tight">
              Pilares de Ingeniería y Arquitectura
            </h2>
            <p className="text-xs font-mono text-[#9b9baa]">
              Pipelines determinísticos en PostgreSQL 16 y Apache Airflow
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Pillar 1 */}
            <div className="p-4 rounded-xl bg-[#171211] border border-[#261f1c] hover:border-[#3d312c] transition-all duration-200 flex flex-col justify-between">
              <div>
                <div className="w-8 h-8 rounded-lg bg-[#241a2e] border border-[#4a365f]/50 flex items-center justify-center text-[#d5c4fb] mb-3">
                  <Layers className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-semibold text-[#f7f7f9] mb-1.5">Arquitectura Medallion</h3>
                <p className="text-[11px] text-[#9b9baa] leading-relaxed">
                  Segregación en esquemas Bronze (<code className="text-[#dedee6]">raw</code>), Silver (<code className="text-[#dedee6]">staging</code>) y Gold (<code className="text-[#dedee6]">curated</code>) con RBAC estricto.
                </p>
              </div>
              <div className="mt-3 pt-2.5 border-t border-[#261f1c] text-[10px] font-mono text-[#d5c4fb]">
                Idempotencia Garantizada
              </div>
            </div>

            {/* Pillar 2 */}
            <div className="p-4 rounded-xl bg-[#171211] border border-[#261f1c] hover:border-[#3d312c] transition-all duration-200 flex flex-col justify-between">
              <div>
                <div className="w-8 h-8 rounded-lg bg-[#14231b] border border-[#224833]/50 flex items-center justify-center text-[#86efac] mb-3">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-semibold text-[#f7f7f9] mb-1.5">Quality Gate Pandera</h3>
                <p className="text-[11px] text-[#9b9baa] leading-relaxed">
                  7 reglas determinísticas (ISO/IEC 25012) que aíslan registros anómalos en cuarentena sin pérdida de información.
                </p>
              </div>
              <div className="mt-3 pt-2.5 border-t border-[#261f1c] text-[10px] font-mono text-[#86efac]">
                Aislamiento en Cuarentena
              </div>
            </div>

            {/* Pillar 3 */}
            <div className="p-4 rounded-xl bg-[#171211] border border-[#261f1c] hover:border-[#3d312c] transition-all duration-200 flex flex-col justify-between">
              <div>
                <div className="w-8 h-8 rounded-lg bg-[#271b22] border border-[#542d40]/50 flex items-center justify-center text-[#f472b6] mb-3">
                  <Compass className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-semibold text-[#f7f7f9] mb-1.5">Clustering Haversine</h3>
                <p className="text-[11px] text-[#9b9baa] leading-relaxed">
                  Detección espacial de enjambres sísmicos sobre la esfera terrestre (R = 6371 km) para racimos de al menos 3 sismos en 2h.
                </p>
              </div>
              <div className="mt-3 pt-2.5 border-t border-[#261f1c] text-[10px] font-mono text-[#f472b6]">
                Geometría Esférica Pura
              </div>
            </div>

            {/* Pillar 4 */}
            <div className="p-4 rounded-xl bg-[#171211] border border-[#261f1c] hover:border-[#3d312c] transition-all duration-200 flex flex-col justify-between">
              <div>
                <div className="w-8 h-8 rounded-lg bg-[#262016] border border-[#523e1e]/50 flex items-center justify-center text-[#fcd34d] mb-3">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-semibold text-[#f7f7f9] mb-1.5">IA Anti-Alucinaciones</h3>
                <p className="text-[11px] text-[#9b9baa] leading-relaxed">
                  Cascada de LLMs con validador determinístico por Regex y copiloto Text-to-SQL blindado por AST.
                </p>
              </div>
              <div className="mt-3 pt-2.5 border-t border-[#261f1c] text-[10px] font-mono text-[#fcd34d]">
                Verificación Numérica Cero Error
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 px-6 bg-[#0c0a09] border-t border-[#1e1715] text-center text-[11px] font-mono text-[#737384]">
        <div>
          SismoWatch &bull; Plataforma de Inteligencia Sísmica
        </div>
      </footer>
    </div>
  );
};
