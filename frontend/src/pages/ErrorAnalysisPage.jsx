import React, { useEffect, useState } from 'react';
import {
  Activity, RefreshCw, AlertCircle, TrendingDown, TrendingUp, Info
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ReferenceLine, ResponsiveContainer, LineChart, Line
} from 'recharts';
import { apiService } from '../services/api';

export default function ErrorAnalysisPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiService.getErrorAnalysis();
      setData(result);
    } catch (err) {
      setError(err.message || 'Error analysis data unavailable.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const hasData = data && data.samples_analyzed > 0;

  // Prep error distribution chart data
  const distData = data?.error_distribution?.map(bin => ({
    name: bin.range_label,
    Count: bin.count,
  })) || [];

  // Prep intensity vs error chart data
  const intensityData = data?.intensity_vs_error?.map(pt => ({
    name: pt.intensity_bin,
    'Raw Error': pt.raw_error,
    'Corrected Error': pt.corrected_error,
  })) || [];

  const improvementRmse = data && data.rmse_raw > 0
    ? (((data.rmse_raw - data.rmse_corrected) / data.rmse_raw) * 100).toFixed(1)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-rose-700 via-pink-600 to-fuchsia-600 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold">Error Analysis</h1>
            <p className="text-rose-200 text-xs">Forecast Error Diagnostics · Distribution · Intensity Stratification</p>
          </div>
        </div>
        <p className="text-sm text-rose-100 leading-relaxed">
          Analyses systematic forecast errors (Forecast − Observation) to diagnose raw NWP biases and quantify how much regime-aware ML post-processing reduces them across rainfall intensity classes.
        </p>
      </div>

      {/* Refresh */}
      <div className="flex justify-end">
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-lg text-xs font-medium hover:bg-rose-700 transition-all disabled:opacity-60"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div><div className="font-semibold">Error</div><div className="text-xs mt-0.5">{error}</div></div>
        </div>
      )}

      {loading && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 animate-pulse h-28 space-y-2"><div className="h-4 bg-slate-200 rounded w-1/2"/><div className="h-8 bg-slate-100 rounded"/></div>)}
        </div>
      )}

      {!loading && (
        <>
          {/* Status */}
          <div className={`flex items-center gap-2 text-xs px-4 py-2.5 rounded-xl border ${
            hasData
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
              : 'bg-amber-50 border-amber-200 text-amber-700'
          }`}>
            <Info className="w-4 h-4" />
            {hasData
              ? `Error analysis computed on ${data.samples_analyzed} matched observation-forecast pairs.`
              : 'No historical matched pairs available yet. Error analysis will populate after historical data ingestion.'
            }
          </div>

          {/* Summary Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { label: 'Mean Error (Bias)', rawKey: 'mean_error_raw', corrKey: 'mean_error_corrected', unit: 'mm', higherIsBetter: false },
              { label: 'MAE', rawKey: 'mae_raw', corrKey: 'mae_corrected', unit: 'mm', higherIsBetter: false },
              { label: 'RMSE', rawKey: 'rmse_raw', corrKey: 'rmse_corrected', unit: 'mm', higherIsBetter: false },
            ].map(({ label, rawKey, corrKey, unit, higherIsBetter }) => {
              const rawVal = data?.[rawKey] ?? 0;
              const corrVal = data?.[corrKey] ?? 0;
              const improved = higherIsBetter ? corrVal > rawVal : corrVal < rawVal;
              return (
                <div key={label} className="bg-white border border-slate-200 rounded-xl p-4">
                  <div className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-3">{label}</div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-slate-50 rounded-lg px-3 py-2 text-center border border-slate-100">
                      <div className="text-[10px] text-slate-400 mb-1">Raw NWP</div>
                      <div className="text-xl font-bold font-mono text-slate-700">{rawVal.toFixed(2)}</div>
                      <div className="text-[10px] text-slate-400">{unit}</div>
                    </div>
                    <div className={`rounded-lg px-3 py-2 text-center border ${improved ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
                      <div className="text-[10px] text-slate-400 mb-1">Corrected</div>
                      <div className={`text-xl font-bold font-mono ${improved ? 'text-emerald-700' : 'text-amber-700'}`}>{corrVal.toFixed(2)}</div>
                      <div className="text-[10px] text-slate-400">{unit}</div>
                    </div>
                  </div>
                  <div className={`flex items-center gap-1 text-xs font-medium mt-2 ${improved ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {improved ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
                    {Math.abs(corrVal - rawVal).toFixed(2)} {unit} {improved ? 'improvement' : 'change'}
                  </div>
                </div>
              );
            })}
          </div>

          {/* RMSE improvement callout */}
          {hasData && (
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl px-6 py-4 flex items-center gap-4">
              <div className="text-3xl font-bold font-mono text-emerald-700">{improvementRmse}%</div>
              <div>
                <div className="text-sm font-semibold text-emerald-800">RMSE Reduction</div>
                <div className="text-xs text-emerald-600">Achieved by regime-aware ML post-processing over raw NWP baseline</div>
              </div>
            </div>
          )}

          {/* Error Distribution Bar Chart */}
          {distData.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
              <h3 className="text-sm font-bold text-slate-800 mb-4">Corrected Forecast Error Distribution</h3>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={distData} margin={{ top: 5, right: 20, bottom: 50, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-30} textAnchor="end" />
                  <YAxis tick={{ fontSize: 10 }} label={{ value: 'Count', angle: -90, position: 'insideLeft', style: { fontSize: 10 } }} />
                  <Tooltip />
                  <Bar dataKey="Count" fill="#f43f5e" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
              <p className="text-[11px] text-slate-400 mt-2">
                Distribution of corrected rainfall errors (Corrected − Observed) across all verification pairs.
              </p>
            </div>
          )}

          {/* Intensity vs Error Chart */}
          {intensityData.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
              <h3 className="text-sm font-bold text-slate-800 mb-1">Intensity-Stratified Error Analysis</h3>
              <p className="text-xs text-slate-500 mb-4">Mean forecast error by observed rainfall intensity class — showing regime-aware correction improvement.</p>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={intensityData} margin={{ top: 5, right: 20, bottom: 50, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-20} textAnchor="end" />
                  <YAxis tick={{ fontSize: 10 }} label={{ value: 'Mean Error (mm)', angle: -90, position: 'insideLeft', style: { fontSize: 10 } }} />
                  <ReferenceLine y={0} stroke="#64748b" strokeDasharray="4 3" />
                  <Tooltip />
                  <Legend verticalAlign="top" height={30} />
                  <Line type="monotone" dataKey="Raw Error" stroke="#94a3b8" strokeWidth={2} dot={{ r: 5 }} />
                  <Line type="monotone" dataKey="Corrected Error" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {!hasData && !loading && (
            <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-400">
              <Activity className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <div className="text-sm font-medium mb-1">Awaiting Historical Data</div>
              <p className="text-xs max-w-sm mx-auto">
                Error analysis charts will render once historical observation and NWP forecast pairs are loaded into the database via the data ingestor.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
