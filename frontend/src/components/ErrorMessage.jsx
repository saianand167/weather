import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function ErrorMessage({ 
  message = "Live data currently unavailable.", 
  subMessage = "Please check the configured data source.",
  onRetry = null,
  isRetrying = false 
}) {
  return (
    <div className="p-6 bg-amber-50/80 border border-amber-200 rounded-xl text-center flex flex-col items-center justify-center max-w-lg mx-auto my-8">
      <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 mb-3">
        <AlertTriangle className="w-6 h-6" />
      </div>
      <h3 className="text-base font-semibold text-slate-800 mb-1">
        {message}
      </h3>
      <p className="text-sm text-slate-600 mb-4 max-w-sm">
        {subMessage}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          disabled={isRetrying}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 active:bg-blue-900 disabled:opacity-50 rounded-lg shadow-sm transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${isRetrying ? 'animate-spin' : ''}`} />
          {isRetrying ? 'Retrying...' : 'Retry Connection'}
        </button>
      )}
    </div>
  );
}
