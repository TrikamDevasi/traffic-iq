import React from 'react';
import { Loader2, AlertTriangle, RefreshCw } from 'lucide-react';

interface AsyncBoundaryProps {
  isLoading: boolean;
  isError: boolean;
  error?: any;
  loadingMessage?: string;
  onRetry?: () => void;
  children: React.ReactNode;
}

const AsyncBoundary: React.FC<AsyncBoundaryProps> = ({
  isLoading,
  isError,
  error,
  loadingMessage = 'Loading data...',
  onRetry,
  children,
}) => {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 animate-in fade-in duration-300">
        <Loader2 className="w-10 h-10 text-primary-500 animate-spin mb-4" />
        <p className="text-slate-500 dark:text-slate-400 font-medium">{loadingMessage}</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <div className="bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 p-4 rounded-full mb-4">
          <AlertTriangle className="w-10 h-10" />
        </div>
        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Failed to load data</h3>
        <p className="text-slate-500 dark:text-slate-400 text-center max-w-md mb-6">
          {error?.data?.message || error?.message || 'An unexpected error occurred while communicating with the server.'}
        </p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="flex items-center gap-2 px-6 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-slate-700 dark:text-slate-200 font-medium"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
        )}
      </div>
    );
  }

  return <>{children}</>;
};

export default AsyncBoundary;
