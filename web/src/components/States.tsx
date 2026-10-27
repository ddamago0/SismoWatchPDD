import React from 'react';
import { AlertTriangle, RefreshCw, Inbox, Loader2 } from 'lucide-react';

export const LoadingState: React.FC<{ message?: string }> = ({
  message = 'Cargando datos sísmicos...',
}) => (
  <div className="flex flex-col items-center justify-center p-12 text-[#9b9baa] bg-[#171211] rounded-2xl border border-[#261f1c] animate-pulse">
    <Loader2 className="w-8 h-8 animate-spin text-[#d5c4fb] mb-3" />
    <p className="text-sm font-mono">{message}</p>
  </div>
);

export const EmptyState: React.FC<{
  title?: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}> = ({
  title = 'No hay eventos sísmicos registrados',
  description = 'No se encontraron sismos con los filtros actuales o la base de datos se encuentra vacía.',
  action,
}) => (
  <div className="flex flex-col items-center justify-center p-12 text-center bg-[#171211] rounded-2xl border border-[#261f1c]">
    <div className="p-3 bg-[#201a18] rounded-full mb-3 text-[#9b9baa]">
      <Inbox className="w-6 h-6" />
    </div>
    <h3 className="text-sm font-semibold text-[#f7f7f9] mb-1">{title}</h3>
    <p className="text-xs text-[#9b9baa] max-w-md mb-4">{description}</p>
    {action && (
      <button
        onClick={action.onClick}
        className="px-4 py-2 bg-[#844dea] hover:bg-[#9f73f2] text-white text-xs font-mono font-medium rounded-xl transition-colors"
      >
        {action.label}
      </button>
    )}
  </div>
);

export const ErrorState: React.FC<{
  title?: string;
  message?: string;
  onRetry?: () => void;
}> = ({
  title = 'Error de conexión',
  message = 'No fue posible sincronizar con el backend de SismoWatch.',
  onRetry,
}) => (
  <div className="flex flex-col items-center justify-center p-8 text-center bg-[#2b1418] rounded-2xl border border-[#4f2026]/70">
    <div className="p-3 bg-[#3d1a20] rounded-full mb-3 text-[#f87171]">
      <AlertTriangle className="w-6 h-6" />
    </div>
    <h3 className="text-sm font-semibold text-[#fca5a5] mb-1">{title}</h3>
    <p className="text-xs text-[#fca5a5]/80 max-w-md mb-4">{message}</p>
    {onRetry && (
      <button
        onClick={onRetry}
        className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#b91c1c] hover:bg-[#dc2626] text-white text-xs font-mono font-medium rounded-xl transition-colors"
      >
        <RefreshCw className="w-3.5 h-3.5" />
        Reintentar
      </button>
    )}
  </div>
);
