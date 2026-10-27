import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Activity,
  LogOut,
  Shield,
  Sparkles,
  BarChart3,
  FileText,
  Workflow,
  User,
} from 'lucide-react';
import { SSEConnectionStatus } from '../services/sse';

export type MainNavTab = 'monitoring' | 'analytics' | 'reports' | 'pipeline' | 'admin_audit';

interface NavbarProps {
  activeTab: MainNavTab;
  onTabChange: (tab: MainNavTab) => void;
  onOpenAiDrawer: () => void;
  connectionStatus: SSEConnectionStatus;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  onOpenAiDrawer,
  connectionStatus,
}) => {
  const { user, isAdmin, logout } = useAuth();

  return (
    <header className="sticky top-0 z-40 bg-[#070b14]/95 backdrop-blur-md border-b border-slate-800 px-4 sm:px-6 py-2.5 select-none">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600/20 text-blue-400 rounded-xl border border-blue-500/30">
            <Activity className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <span className="font-extrabold text-base tracking-tight text-white">SismoWatch</span>
            <p className="text-[10px] text-slate-400 font-mono hidden sm:block">
              Consola Operativa Medallion
            </p>
          </div>
        </div>

        {/* Navigation Tabs based on Role */}
        <nav className="flex items-center p-1 bg-slate-950 rounded-xl border border-slate-800 text-xs font-mono">
          <button
            onClick={() => onTabChange('monitoring')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
              activeTab === 'monitoring'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Monitoreo</span>
          </button>

          <button
            onClick={() => onTabChange('analytics')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
              activeTab === 'analytics'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Análisis</span>
          </button>

          <button
            onClick={() => onTabChange('reports')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
              activeTab === 'reports'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Reportes</span>
          </button>

          <button
            onClick={() => onTabChange('pipeline')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
              activeTab === 'pipeline'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Workflow className="w-3.5 h-3.5" />
            <span>Estado Pipeline</span>
          </button>

          {/* Admin Exclusive Tab */}
          {isAdmin && (
            <button
              onClick={() => onTabChange('admin_audit')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
                activeTab === 'admin_audit'
                  ? 'bg-rose-600 text-white shadow'
                  : 'text-rose-400 hover:text-white hover:bg-rose-950/40'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Auditoría & Cuarentena</span>
            </button>
          )}
        </nav>

        {/* Right Tools & User Profile */}
        <div className="flex items-center gap-2.5">
          {/* Subtle Connection Status Dot */}
          <div
            title={
              connectionStatus === 'connected'
                ? 'Flujo continuo en línea'
                : connectionStatus === 'reconnecting'
                ? 'Reconectando flujo...'
                : 'Desconectado'
            }
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-800 text-[10px] font-mono"
          >
            <span
              className={`w-2 h-2 rounded-full ${
                connectionStatus === 'connected'
                  ? 'bg-emerald-400 animate-pulse'
                  : connectionStatus === 'reconnecting'
                  ? 'bg-amber-400 animate-ping'
                  : 'bg-rose-500'
              }`}
            />
            <span className="text-slate-400 hidden lg:inline">
              {connectionStatus === 'connected' ? 'En línea' : 'Reconectando'}
            </span>
          </div>

          {/* AI Drawer Action Button */}
          <button
            onClick={onOpenAiDrawer}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-blue-400 hover:text-blue-300 border border-blue-500/30 text-xs font-mono font-bold transition-all"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Asistente IA</span>
          </button>

          {/* Role Profile Badge */}
          {user && (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
              <div
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border font-mono text-[11px] ${
                  isAdmin
                    ? 'bg-rose-950/30 border-rose-800/60 text-rose-300'
                    : 'bg-blue-950/30 border-blue-800/60 text-blue-300'
                }`}
              >
                {isAdmin ? <Shield className="w-3.5 h-3.5 text-rose-400" /> : <User className="w-3.5 h-3.5 text-blue-400" />}
                <div className="text-left leading-none">
                  <div className="font-bold text-white text-[10px]">{user.username}</div>
                  <div className="text-[9px] uppercase tracking-wider font-extrabold opacity-80">
                    {isAdmin ? 'ADMIN' : 'VIEWER'}
                  </div>
                </div>
              </div>

              <button
                onClick={logout}
                title="Cerrar sesión"
                className="p-1.5 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-900 transition-colors"
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
