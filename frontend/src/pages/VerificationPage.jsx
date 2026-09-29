import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart3, RefreshCw, AlertCircle, TrendingDown, TrendingUp,
  CheckCircle2, Info, ChevronRight, Target
} from 'lucide-react';
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line
} from 'recharts';
import { apiService } from '../services/api';

const THRESHOLDS = [5, 10, 15, 25, 50];

function MetricCard({ label, rawVal, corrVal, higherIsBetter = false }) {
  const improved = higherIsBetter
    ? corrVal > rawVal
    : corrVal < rawVal;
  const delta = corrVal - rawVal;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
      <div className="text-xs font-semibold text-slate-600 uppercase tracking-wider">{label}</div>
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-slate-50 rounded-lg px-3 py-2 text-center border border-slate-100">
          <div className="text-[10px] text-slate-400 mb-1">Raw NWP</div>
          <div className="text-xl font-bold font-mono text-slate-700">{rawVal?.toFixed ? rawVal.toFixed(3) : rawVal}</div>
        </div>
        <div className={`rounded-lg px-3 py-2 text-center border ${improved ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
          <div className="text-[10px] text-slate-400 mb-1">Corrected</div>
          <div className={`text-xl font-bold font-mono ${improved ? 'text-emerald-700' : 'text-amber-700'}`}>
            {corrVal?.toFixed ? corrVal.toFixed(3) : corrVal}
          </div>
        </div>
      </div>
      <div className={`flex items-center gap-1 text-xs font-medium ${improved ? 'text-emerald-600' : 'text-amber-600'}`}>
        {improved ? <TrendingDown className="w-3.5 h-3.5" /> : <TrendingUp className="w-3.5 h-3.5" />}
        {Math.abs(delta).toFixed(3)} {improved ? 'improvement' : 'change'}
      </div>
    </div>
  );
}

const REGIME_COLORS = {
  'Active Monsoon': '#3b82f6',
  'Break Monsoon': '#f59e0b',
  'Monsoon Lows / Depressions': '#ef4444',
  'Orographic Rainfall': '#10b981',
  'Coastal Rainfall': '#06b6d4',
  'Western Disturbances': '#8b5cf6',
};

export default function VerificationPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [threshold, setThreshold] = useState(15);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiService.getVerificationSummary(threshold);
      setData(result);
    } catch (err) {
      setError(err.message || 'Verification data unavailable.');
    } finally {
      setLoading(false);
    }
  }, [threshold]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const hasData = data && data.sample_count > 0;

  // Regime radar chart data
  const radarData = data?.regime_wise?.map(r => ({
    regime: r.regime.split(' ')[0], // short label
    fullName: r.regime,
    raw_csi: r.raw_csi,
    corrected_csi: r.corrected_csi,
    raw_pod: r.raw_pod,
    corrected_pod: r.corrected_pod,
  })) || [];

  // Bar chart data for regime RMSE comparison
  const regimeBarData = data?.regime_wise?.map(r => ({
    name: r.regime.replace('Monsoon Lows / Depressions', 'Lows/Dep.'),
    'Raw RMSE': r.raw_rmse,
    'Corrected RMSE': r.corrected_rmse,
  })) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-700 via-violet-600 to-indigo-600 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold">Verification Scorecard</h1>
            <p className="text-violet-200 text-xs">RMSE · MAE · Bias · CSI · ETS · POD · FAR · FSS</p>
          </div>
        </div>
        <p className="text-sm text-violet-100 leading-relaxed">
          Scientific verification comparing Raw NWP baseline vs ML Regime-Aware Corrected Forecast across continuous and categorical metrics. Regime-stratified performance breakdown included.
        </p>
      </div>

      {/* Threshold selector + Refresh */}
      <div className="flex flex-wrap gap-3 items-center">
        <span className="text-xs font-semibold text-slate-600">Rainfall Threshold:</span>
        <div className="flex gap-1">
          {THRESHOLDS.map(t => (
            <button
              key={t}
              onClick={() => setThreshold(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                threshold === t
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {t} mm
            </button>
          ))}
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="ml-auto flex items-center gap-2 px-4 py-1.5 bg-violet-600 text-white rounded-lg text-xs font-medium hover:bg-violet-700 transition-all disabled:opacity-60"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div><div className="font-semibold">Verification Error</div><div className="text-xs mt-0.5">{error}</div></div>
        </div>
      )}

      {loading && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 animate-pulse h-32 space-y-2"><div className="h-4 bg-slate-200 rounded w-1/2"/><div className="h-8 bg-slate-100 rounded"/></div>)}
        </div>
      )}

      {!loading && (
        <>
          {/* Sample count notice */}
          <div className={`flex items-center gap-2 text-xs px-4 py-2.5 rounded-xl border ${
            hasData
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
              : 'bg-amber-50 border-amber-200 text-amber-700'
          }`}>
            {hasData ? <CheckCircle2 className="w-4 h-4" /> : <Info className="w-4 h-4" />}
            {hasData
              ? `Verification computed on ${data.sample_count} matched observation-forecast pairs at ${threshold} mm threshold.`
              : `No historical observation pairs loaded yet. Verification scorecard will populate once historical data is ingested.`
            }
          </div>

          {/* Continuous Metrics Grid */}
          <div>
            <h3 className="text-sm font-bold text-slate-700 mb-3">Continuous Metrics</h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard label="RMSE (mm)" rawVal={data?.raw_nwp?.rmse || 0} corrVal={data?.corrected?.rmse || 0} />
              <MetricCard label="MAE (mm)" rawVal={data?.raw_nwp?.mae || 0} corrVal={data?.corrected?.mae || 0} />
              <MetricCard label="Bias (mm)" rawVal={data?.raw_nwp?.bias || 0} corrVal={data?.corrected?.bias || 0} />
              <MetricCard label="Correlation (r)" rawVal={data?.raw_nwp?.correlation || 0} corrVal={data?.corrected?.correlation || 0} higherIsBetter />
            </div>
          </div>

          {/* Categorical Metrics Grid */}
          <div>
            <h3 className="text-sm font-bold text-slate-700 mb-3">Categorical Metrics (threshold: {threshold} mm)</h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard label="CSI (Threat Score)" rawVal={data?.raw_nwp?.csi || 0} corrVal={data?.corrected?.csi || 0} higherIsBetter />
              <MetricCard label="ETS" rawVal={data?.raw_nwp?.ets || 0} corrVal={data?.corrected?.ets || 0} higherIsBetter />
              <MetricCard label="POD (Detection Rate)" rawVal={data?.raw_nwp?.pod || 0} corrVal={data?.corrected?.pod || 0} higherIsBetter />
              <MetricCard label="FAR (False Alarm Ratio)" rawVal={data?.raw_nwp?.far || 0} corrVal={data?.corrected?.far || 0} />
            </div>
          </div>

          {/* Improvement Summary */}
          {data?.improvements && (
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-5">
              <h3 className="text-sm font-bold text-emerald-800 mb-4 flex items-center gap-2">
                <Target className="w-4 h-4" />
                ML Improvement Summary
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { label: 'RMSE Reduction', value: data.improvements.rmse_reduction_percent, suffix: '%' },
                  { label: 'MAE Reduction', value: data.improvements.mae_reduction_percent, suffix: '%' },
                  { label: 'CSI Gain', value: data.improvements.csi_gain_percent, suffix: '%' },
                ].map(({ label, value, suffix }) => (
                  <div key={label} className="text-center bg-white/70 rounded-xl p-4 border border-emerald-100">
                    <div className="text-3xl font-bold font-mono text-emerald-700">
                      {value > 0 ? '+' : ''}{value.toFixed(1)}{suffix}
                    </div>
                    <div className="text-xs text-emerald-600 mt-1">{label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* FSS Status */}
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 mb-1">
              <Info className="w-4 h-4 text-blue-500" />
              Fractions Skill Score (FSS)
            </div>
            <p className="text-xs text-slate-500">{data?.raw_nwp?.fss_status || 'FSS unavailable: requires 2D spatial grid data.'}</p>
          </div>

          {/* Regime-wise Bar Chart */}
          {regimeBarData.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
              <h3 className="text-sm font-bold text-slate-800 mb-4">Regime-Wise RMSE: Raw NWP vs Corrected</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={regimeBarData} margin={{ top: 5, right: 20, bottom: 60, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-25} textAnchor="end" />
                  <YAxis tick={{ fontSize: 10 }} label={{ value: 'RMSE (mm)', angle: -90, position: 'insideLeft', style: { fontSize: 10 } }} />
                  <Tooltip />
                  <Legend verticalAlign="top" height={30} />
                  <Bar dataKey="Raw RMSE" fill="#94a3b8" radius={[4,4,0,0]} />
                  <Bar dataKey="Corrected RMSE" fill="#6366f1" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Regime-wise Table */}
          {data?.regime_wise && data.regime_wise.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-800">Regime-Wise Performance Breakdown</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4 text-left">Regime</th>
                      <th className="py-3 px-4 text-center">Samples</th>
                      <th className="py-3 px-4 text-center" colSpan={2}>RMSE</th>
                      <th className="py-3 px-4 text-center" colSpan={2}>MAE</th>
                      <th className="py-3 px-4 text-center" colSpan={2}>CSI</th>
                      <th className="py-3 px-4 text-center" colSpan={2}>POD</th>
                    </tr>
                    <tr className="text-[10px] bg-slate-50 border-t border-slate-100">
                      <th className="pb-2 px-4"></th>
                      <th className="pb-2"></th>
                      <th className="pb-2 text-slate-400">Raw</th>
                      <th className="pb-2 text-indigo-600">ML</th>
                      <th className="pb-2 text-slate-400">Raw</th>
                      <th className="pb-2 text-indigo-600">ML</th>
                      <th className="pb-2 text-slate-400">Raw</th>
                      <th className="pb-2 text-indigo-600">ML</th>
                      <th className="pb-2 text-slate-400">Raw</th>
                      <th className="pb-2 text-indigo-600">ML</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.regime_wise.map((r) => (
                      <tr key={r.regime} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-medium text-slate-800">{r.regime}</td>
                        <td className="py-3 px-4 text-center text-slate-500">{r.samples}</td>
                        <td className="py-3 px-4 text-center text-slate-500 font-mono">{r.raw_rmse}</td>
                        <td className="py-3 px-4 text-center text-indigo-700 font-mono font-semibold">{r.corrected_rmse}</td>
                        <td className="py-3 px-4 text-center text-slate-500 font-mono">{r.raw_mae}</td>
                        <td className="py-3 px-4 text-center text-indigo-700 font-mono font-semibold">{r.corrected_mae}</td>
                        <td className="py-3 px-4 text-center text-slate-500 font-mono">{r.raw_csi}</td>
                        <td className="py-3 px-4 text-center text-indigo-700 font-mono font-semibold">{r.corrected_csi}</td>
                        <td className="py-3 px-4 text-center text-slate-500 font-mono">{r.raw_pod}</td>
                        <td className="py-3 px-4 text-center text-indigo-700 font-mono font-semibold">{r.corrected_pod}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
