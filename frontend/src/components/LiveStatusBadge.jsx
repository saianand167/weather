import React from 'react';
import { Activity, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

export default function LiveStatusBadge({ 
  isConnected = true, 
  lastUpdated = null, 
  source = "Open-Meteo NWP (ECMWF/GFS)",
  onRefresh = null,
  isRefreshing = false
}) {
  const formatTime = (ts) => {
    if (!ts) return "Not available";
    try {
      const d = new Date(ts);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + 
        ' (' + d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ')';
    } catch {
      return ts;
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-white border border-slate-200 rounded-lg shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2.5 w-2.5">
            {isConnected && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            )}
            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isConnected ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
          </span>
          <span className="text-xs font-semibold tracking-wider text-slate-700 uppercase">
            LIVE DATA
          </span>
        </div>

        <span className="text-slate-300">|</span>

        <div className="flex items-center gap-1.5 text-xs">
          {isConnected ? (
            <span className="inline-flex items-center gap-1 font-medium text-emerald-700">
              <CheckCircle2 className="w-3.5 h-3.5" /> Connected
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 font-medium text-rose-700">
              <AlertCircle className="w-3.5 h-3.5" /> Offline / Unavailable
            </span>
          )}
        </div>

        <span className="hidden sm:inline text-slate-300">|</span>

        <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500">
          <span>Source:</span>
          <span className="font-medium text-slate-700">{source}</span>
        </div>

        <span className="hidden md:inline text-slate-300">|</span>

        <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-500">
          <span>Last updated:</span>
          <span className="font-mono font-medium text-slate-700">{formatTime(lastUpdated)}</span>
        </div>
      </div>

      {onRefresh && (
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors"
          title="Fetch fresh meteorological observation"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      )}
    </div>
  );
}
