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
    <header className="sticky top-0 z-40 bg-[#120e0d]/90 backdrop-blur-md border-b border-[#241c19] px-4 sm:px-6 py-2 select-none">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#241a2e] text-[#d5c4fb] flex items-center justify-center border border-[#4a365f]/50">
            <Activity className="w-4 h-4 animate-pulse text-[#d5c4fb]" />
          </div>
          <div>
            <span className="font-semibold text-sm text-[#f7f7f9] tracking-tight">SismoWatch</span>
            <p className="text-[10px] text-[#9b9baa] font-mono hidden sm:block">
              Consola Operativa Medallion
            </p>
          </div>
        </div>

        {/* Navigation Tabs based on Role */}
        <nav className="flex items-center p-0.5 bg-[#171211] rounded-xl border border-[#261f1c] text-xs font-mono">
          <button
            onClick={() => onTabChange('monitoring')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all duration-150 ${
              activeTab === 'monitoring'
                ? 'bg-[#844dea] text-white shadow-sm'
                : 'text-[#9b9baa] hover:text-[#f7f7f9] hover:bg-[#201a18]'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Monitoreo</span>
          </button>

          <button
            onClick={() => onTabChange('analytics')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all duration-150 ${
              activeTab === 'analytics'
                ? 'bg-[#844dea] text-white shadow-sm'
                : 'text-[#9b9baa] hover:text-[#f7f7f9] hover:bg-[#201a18]'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Análisis</span>
          </button>

          <button
            onClick={() => onTabChange('reports')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all duration-150 ${
              activeTab === 'reports'
                ? 'bg-[#844dea] text-white shadow-sm'
                : 'text-[#9b9baa] hover:text-[#f7f7f9] hover:bg-[#201a18]'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Reportes</span>
          </button>

          <button
            onClick={() => onTabChange('pipeline')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all duration-150 ${
              activeTab === 'pipeline'
                ? 'bg-[#844dea] text-white shadow-sm'
                : 'text-[#9b9baa] hover:text-[#f7f7f9] hover:bg-[#201a18]'
            }`}
          >
            <Workflow className="w-3.5 h-3.5" />
            <span>Estado Pipeline</span>
          </button>

          {/* Admin Exclusive Tab */}
          {isAdmin && (
            <button
              onClick={() => onTabChange('admin_audit')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all duration-150 ${
                activeTab === 'admin_audit'
                  ? 'bg-[#b91c1c] text-white shadow-sm'
                  : 'text-[#fca5a5] hover:text-white hover:bg-[#291418]'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Auditoría & Cuarentena</span>
            </button>
          )}
        </nav>

        {/* User Profile & Logout */}
        <div className="flex items-center gap-2">
          {/* Role Profile Badge */}
          {user && (
            <div className="flex items-center gap-2 pl-2 border-l border-[#241c19]">
              <div
                className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border font-mono text-[10px] ${
                  isAdmin
                    ? 'bg-[#261418] border-[#4a2027] text-[#fca5a5]'
                    : 'bg-[#1e1927] border-[#392e4a] text-[#d5c4fb]'
                }`}
              >
                {isAdmin ? <Shield className="w-3 h-3 text-[#fca5a5]" /> : <User className="w-3 h-3 text-[#d5c4fb]" />}
                <div className="text-left leading-none">
                  <div className="font-semibold text-[#f7f7f9]">{user.username}</div>
                  <div className="text-[8px] uppercase tracking-wider opacity-75 mt-0.5">
                    {isAdmin ? 'ADMIN' : 'VIEWER'}
                  </div>
                </div>
              </div>

              <button
                onClick={logout}
                title="Cerrar sesión"
                className="p-1.5 rounded-lg text-[#9b9baa] hover:text-[#f87171] hover:bg-[#1f1715] transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
