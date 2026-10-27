import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Activity, LogOut, Shield, Sparkles, Workflow, Layers, Radio } from 'lucide-react';
import { SSEConnectionStatus } from '../services/sse';

interface NavbarProps {
  activeTab: 'dashboard' | 'lineage';
  onTabChange: (tab: 'dashboard' | 'lineage') => void;
  onOpenAiQuery: () => void;
  connectionStatus: SSEConnectionStatus;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  onOpenAiQuery,
  connectionStatus,
}) => {
  const { user, isAdmin, logout } = useAuth();

  return (
    <header className="sticky top-0 z-40 bg-dark-950/85 backdrop-blur-xl border-b border-white/10 px-4 sm:px-6 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Brand & Architecture Badge */}
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-tr from-coral-500 to-rose-600 rounded-xl shadow-glow-coral text-white">
            <Activity className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base tracking-tight text-white">SismoWatch</span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-black uppercase tracking-wider bg-coral-500/15 text-coral-400 border border-coral-500/30">
                SUPERAPP PDD
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono hidden sm:block">
              Arquitectura Medallion & Detección en Tiempo Real
            </p>
          </div>
        </div>

        {/* View Switcher (Dashboard vs Lineage) */}
        <div className="flex items-center p-1 bg-dark-900 rounded-xl border border-white/10">
          <button
            onClick={() => onTabChange('dashboard')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
              activeTab === 'dashboard'
                ? 'bg-cobalt-500 text-white shadow-glow-cobalt'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Operaciones</span>
          </button>
          <button
            onClick={() => onTabChange('lineage')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
              activeTab === 'lineage'
                ? 'bg-coral-500 text-white shadow-glow-coral'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Workflow className="w-3.5 h-3.5" />
            <span>Linaje & Auditoría</span>
          </button>
        </div>

        {/* Right Tools & Profile */}
        <div className="flex items-center gap-2.5">
          {/* SSE Pulse Indicator */}
          <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-xl bg-dark-900 border border-white/10 text-[10px] font-mono">
            <span
              className={`w-2 h-2 rounded-full ${
                connectionStatus === 'connected'
                  ? 'bg-emerald-400 animate-ping'
                  : connectionStatus === 'reconnecting'
                  ? 'bg-amber-400 animate-pulse'
                  : 'bg-rose-500'
              }`}
            />
            <span
              className={
                connectionStatus === 'connected'
                  ? 'text-emerald-400 font-semibold'
                  : connectionStatus === 'reconnecting'
                  ? 'text-amber-400 font-semibold'
                  : 'text-rose-400 font-semibold'
              }
            >
              {connectionStatus === 'connected'
                ? 'SSE EN VIVO'
                : connectionStatus === 'reconnecting'
                ? 'RECONECTANDO'
                : 'DESCONECTADO'}
            </span>
          </div>

          {/* AI Assistant Button */}
          <button
            onClick={onOpenAiQuery}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-dark-900 hover:bg-dark-850 text-cobalt-400 hover:text-cobalt-300 border border-cobalt-500/30 text-xs font-mono font-bold transition-all shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Asistente IA SQL</span>
          </button>

          {/* User Profile Badge */}
          {user && (
            <div className="flex items-center gap-2 pl-2 border-l border-white/10">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-dark-900 border border-white/10">
                <Shield
                  className={`w-3.5 h-3.5 ${isAdmin ? 'text-coral-400' : 'text-cobalt-400'}`}
                />
                <div className="text-left font-mono">
                  <div className="text-xs font-bold text-white leading-none">{user.username}</div>
                  <span
                    className={`text-[9px] font-bold uppercase tracking-wider ${
                      isAdmin ? 'text-coral-400' : 'text-cobalt-400'
                    }`}
                  >
                    {user.role}
                  </span>
                </div>
              </div>

              <button
                onClick={logout}
                title="Cerrar sesión"
                className="p-1.5 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-dark-900 transition-colors border border-transparent hover:border-white/10"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
