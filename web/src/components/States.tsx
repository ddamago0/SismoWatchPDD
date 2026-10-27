import React from 'react';
import { AlertTriangle, RefreshCw, Inbox, Loader2 } from 'lucide-react';

export const LoadingState: React.FC<{ message?: string }> = ({
  message = 'Cargando datos sísmicos...',
}) => (
  <div className="flex flex-col items-center justify-center p-12 text-slate-400 bg-slate-900/50 rounded-xl border border-slate-800 animate-pulse">
    <Loader2 className="w-10 h-10 animate-spin text-indigo-500 mb-3" />
    <p className="text-sm font-medium">{message}</p>
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
  <div className="flex flex-col items-center justify-center p-12 text-center bg-slate-900/40 rounded-xl border border-slate-800">
    <div className="p-3 bg-slate-800/80 rounded-full mb-3 text-slate-400">
      <Inbox className="w-8 h-8" />
    </div>
    <h3 className="text-base font-semibold text-slate-200 mb-1">{title}</h3>
    <p className="text-xs text-slate-400 max-w-md mb-4">{description}</p>
    {action && (
      <button
        onClick={action.onClick}
        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-lg transition-colors"
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
  <div className="flex flex-col items-center justify-center p-8 text-center bg-rose-950/20 rounded-xl border border-rose-900/40">
    <div className="p-3 bg-rose-900/30 rounded-full mb-3 text-rose-400">
      <AlertTriangle className="w-8 h-8" />
    </div>
    <h3 className="text-base font-semibold text-rose-200 mb-1">{title}</h3>
    <p className="text-xs text-rose-300/80 max-w-md mb-4">{message}</p>
    {onRetry && (
      <button
        onClick={onRetry}
        className="inline-flex items-center gap-2 px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium rounded-lg transition-colors"
      >
        <RefreshCw className="w-3.5 h-3.5" />
        Reintentar
      </button>
    )}
  </div>
);
