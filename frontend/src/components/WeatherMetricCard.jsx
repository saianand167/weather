import React from 'react';

export default function WeatherMetricCard({ 
  title, 
  value, 
  unit = "", 
  icon: Icon, 
  subtitle = null, 
  statusColor = "blue",
  helperText = null 
}) {
  const colorMap = {
    blue: "text-blue-700 bg-blue-50 border-blue-100",
    emerald: "text-emerald-700 bg-emerald-50 border-emerald-100",
    amber: "text-amber-700 bg-amber-50 border-amber-100",
    indigo: "text-indigo-700 bg-indigo-50 border-indigo-100",
    sky: "text-sky-700 bg-sky-50 border-sky-100",
    slate: "text-slate-700 bg-slate-100 border-slate-200"
  };

  const badgeStyle = colorMap[statusColor] || colorMap.blue;

  return (
    <div className="bg-white p-5 border border-slate-200/80 rounded-xl shadow-xs hover:border-slate-300 transition-all">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold tracking-wide uppercase text-slate-500">
          {title}
        </span>
        {Icon && (
          <div className={`p-2 rounded-lg border ${badgeStyle}`}>
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      <div className="flex items-baseline gap-1.5">
        <span className="text-2xl font-bold tracking-tight text-slate-900 font-mono">
          {value !== null && value !== undefined ? value : "—"}
        </span>
        {unit && (
          <span className="text-sm font-medium text-slate-500">
            {unit}
          </span>
        )}
      </div>

      {subtitle && (
        <div className="mt-1 text-xs font-medium text-slate-600">
          {subtitle}
        </div>
      )}

      {helperText && (
        <div className="mt-2 pt-2 border-t border-slate-100 text-[11px] text-slate-400">
          {helperText}
        </div>
      )}
    </div>
  );
}
