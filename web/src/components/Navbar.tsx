import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Activity, ShieldCheck, User, LogIn, LogOut, Sparkles, Database } from 'lucide-react';

interface NavbarProps {
  isLive: boolean;
  onOpenAiQuery: () => void;
  onOpenAirflow?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ isLive, onOpenAiQuery }) => {
  const { user, isAdmin, logout, setShowLoginModal } = useAuth();

  return (
    <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="p-2 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-500 shadow-sm shadow-rose-500/20">
            <Activity className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-black tracking-tight text-white">SismoWatch</span>
              <span className="px-1.5 py-0.5 text-[10px] uppercase font-bold tracking-wider bg-rose-500/20 text-rose-300 rounded border border-rose-500/30">
                SuperApp
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">Arquitectura Medallion & Detección en Tiempo Real</p>
          </div>
        </div>

        {/* Live Indicator + Actions */}
        <div className="flex items-center gap-3">
          {/* Live Indicator */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-950/70 border border-slate-800 rounded-full">
            <span className="relative flex h-2.5 w-2.5">
              {isLive ? (
                <>
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </>
              ) : (
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
              )}
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              {isLive ? 'SSE En Vivo' : 'Conectando...'}
            </span>
          </div>

          {/* AI Assistant Button (Text-to-SQL) */}
          <button
            onClick={onOpenAiQuery}
            className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-semibold rounded-lg shadow-sm shadow-indigo-500/30 transition-all"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Asistente IA SQL</span>
          </button>

          {/* User & Role Badge */}
          {user ? (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
              <div className="flex items-center gap-2 px-2.5 py-1 bg-slate-800/80 rounded-lg border border-slate-700/60">
                <div className={`p-1 rounded-full ${isAdmin ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-500/20 text-blue-400'}`}>
                  {isAdmin ? <ShieldCheck className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                </div>
                <div className="text-left">
                  <div className="text-xs font-bold text-white leading-tight">{user.username}</div>
                  <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    {user.role}
                  </div>
                </div>
              </div>
              <button
                onClick={logout}
                title="Cerrar sesión"
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowLoginModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium rounded-lg border border-slate-700 transition-colors"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Acceder</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
