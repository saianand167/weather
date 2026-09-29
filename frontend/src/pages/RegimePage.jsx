import React, { useState, useEffect, useCallback } from 'react';
import {
  BrainCircuit, CloudRain, Thermometer, Droplets, Wind,
  Gauge, RefreshCw, AlertCircle, CheckCircle2,
  BarChart2, Info
} from 'lucide-react';
import LocationSelector from '../components/LocationSelector';
import { apiService } from '../services/api';

const REGIME_META = {
  'Active Monsoon': { color: 'blue', emoji: '🌧️', desc: 'Widespread sustained rainfall along the monsoon trough across India.' },
  'Break Monsoon': { color: 'orange', emoji: '☀️', desc: 'Suppressed rainfall across central India; rainfall confined to foothills.' },
  'Monsoon Lows / Depressions': { color: 'red', emoji: '🌀', desc: 'Synoptic low-pressure system with heavy convective precipitation.' },
  'Orographic Rainfall': { color: 'emerald', emoji: '⛰️', desc: 'Strong windward moisture impingement on Western Ghats or Himalayas.' },
  'Coastal Rainfall': { color: 'cyan', emoji: '🌊', desc: 'Maritime boundary layer convergence and sea-breeze precipitation.' },
  'Western Disturbances': { color: 'violet', emoji: '❄️', desc: 'Extratropical frontal weather system affecting North/Northwest India.' },
};

function RegimeBadge({ regime, confidence }) {
  const meta = REGIME_META[regime] || { color: 'slate', emoji: '🌡️', desc: '' };
  const colorMap = {
    blue: 'bg-blue-100 text-blue-800 border-blue-300',
    orange: 'bg-orange-100 text-orange-800 border-orange-300',
    red: 'bg-red-100 text-red-800 border-red-300',
    emerald: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    cyan: 'bg-cyan-100 text-cyan-800 border-cyan-300',
    violet: 'bg-violet-100 text-violet-800 border-violet-300',
    slate: 'bg-slate-100 text-slate-800 border-slate-300',
  };
  return (
    <span className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-base font-bold border ${colorMap[meta.color]}`}>
      <span>{meta.emoji}</span>
      {regime}
      {confidence != null && (
        <span className="text-xs font-normal opacity-80">({(confidence * 100).toFixed(0)}% confidence)</span>
      )}
    </span>
  );
}

function ProbBar({ regime, probability, isTop }) {
  const meta = REGIME_META[regime] || { color: 'slate' };
  const pct = Math.round(probability * 100);
  const colorBar = {
    blue: 'bg-blue-500',
    orange: 'bg-orange-500',
    red: 'bg-red-500',
    emerald: 'bg-emerald-500',
    cyan: 'bg-cyan-500',
    violet: 'bg-violet-500',
    slate: 'bg-slate-500',
  };
  return (
    <div className={`flex items-center gap-2 sm:gap-3 py-1.5 ${isTop ? 'font-semibold' : ''}`}>
      <span className="text-xs text-slate-600 w-32 sm:w-48 shrink-0 truncate">{REGIME_META[regime]?.emoji} {regime}</span>
      <div className="flex-1 bg-slate-100 rounded-full h-2.5 overflow-hidden">
        <div
          className={`h-2.5 rounded-full transition-all duration-500 ${colorBar[meta.color] || 'bg-slate-400'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-slate-700 w-10 text-right font-mono">{pct}%</span>
    </div>
  );
}

export default function RegimePage({ selectedLocation, onLocationChange, liveWeather }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const classify = useCallback(async (loc) => {
    if (!loc || !loc.latitude || !loc.longitude) return;
    setLoading(true);
    setError(null);
    try {
      const result = await apiService.getRegimeClassification({
        lat: loc.latitude,
        lon: loc.longitude,
        district: loc.district,
        state: loc.state,
        liveWeather,
      });
      setData(result);
    } catch (err) {
      setError(err.message || 'Regime classification failed.');
    } finally {
      setLoading(false);
    }
  }, [liveWeather]);

  useEffect(() => {
    if (selectedLocation && selectedLocation.district) {
      classify(selectedLocation);
    }
  }, [selectedLocation?.district, selectedLocation?.state, classify]);

  const handleLocationChange = (loc) => {
    onLocationChange(loc);
    classify(loc);
  };

  const handleRun = () => classify(selectedLocation);

  const probEntries = data?.probabilities
    ? Object.entries(data.probabilities).sort((a, b) => b[1] - a[1])
    : [];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-600 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur">
            <BrainCircuit className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold">Synoptic Weather Regime Classification</h1>
            <p className="text-blue-100 text-xs">Identifies the Active Weather Regime Over India</p>
          </div>
        </div>
        <p className="text-sm text-blue-100 mt-1 leading-relaxed">
          Forecast errors over India are regime-dependent. The classifier determines the prevailing synoptic regime to select the optimal bias-correction model.
        </p>
      </div>

      {/* Location + Run */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <LocationSelector
            selectedLocation={selectedLocation}
            onLocationChange={handleLocationChange}
            disabled={loading}
          />
        </div>
        <button
          onClick={handleRun}
          disabled={loading}
          id="btn-classify-regime"
          className="flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm transition-all disabled:opacity-60 shadow-md"
        >
          {loading ? (
            <><RefreshCw className="w-4 h-4 animate-spin" /> Classifying…</>
          ) : (
            <><BrainCircuit className="w-4 h-4" /> Classify Current Regime</>
          )}
        </button>
      </div>

      {/* Error */}
      {error && !loading && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold">Classification Unavailable</div>
            <div className="text-xs mt-0.5 text-red-600">{error}</div>
          </div>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2].map(i => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-6 animate-pulse space-y-4">
              <div className="h-6 bg-slate-200 rounded w-1/3" />
              <div className="h-16 bg-slate-100 rounded-xl" />
              <div className="h-20 bg-slate-100 rounded-xl" />
            </div>
          ))}
        </div>
      )}

      {/* Results */}
      {data && !loading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Active Regime Card */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                <h3 className="text-base font-bold text-slate-800">Active Synoptic Regime</h3>
              </div>
              <span className="text-xs text-slate-500 font-medium">
                {selectedLocation.district}, {selectedLocation.state}
              </span>
            </div>

            <div className="text-center py-4 space-y-2">
              <div className="text-5xl">{REGIME_META[data.predicted_regime]?.emoji || '🌧️'}</div>
              <div className="pt-2">
                <RegimeBadge regime={data.predicted_regime} confidence={data.confidence} />
              </div>
              <p className="text-xs text-slate-500 max-w-sm mx-auto pt-2">
                {REGIME_META[data.predicted_regime]?.desc}
              </p>
            </div>

            {/* Scientific Explanation */}
            <div className="bg-blue-50/80 border border-blue-100 rounded-xl p-4">
              <div className="flex items-center gap-2 text-xs font-bold text-blue-800 mb-1.5">
                <Info className="w-4 h-4 text-blue-700 shrink-0" />
                Synoptic Characteristics & Explanation
              </div>
              <p className="text-xs text-blue-900 leading-relaxed font-normal">{data.explanation}</p>
            </div>

            {/* Relevant Weather Factors */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <div className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Relevant Weather Factors
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {data.features && (
                  <>
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 flex items-center justify-between">
                      <span className="text-slate-500 flex items-center gap-1.5"><Thermometer className="w-3.5 h-3.5 text-amber-500" /> Temp</span>
                      <span className="font-semibold text-slate-800">{data.features.temperature?.toFixed(1) || '—'} °C</span>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 flex items-center justify-between">
                      <span className="text-slate-500 flex items-center gap-1.5"><Droplets className="w-3.5 h-3.5 text-blue-500" /> Humidity</span>
                      <span className="font-semibold text-slate-800">{data.features.humidity?.toFixed(0) || '—'} %</span>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 flex items-center justify-between">
                      <span className="text-slate-500 flex items-center gap-1.5"><Wind className="w-3.5 h-3.5 text-sky-500" /> Wind Speed</span>
                      <span className="font-semibold text-slate-800">{data.features.wind_speed?.toFixed(1) || '—'} km/h</span>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 flex items-center justify-between">
                      <span className="text-slate-500 flex items-center gap-1.5"><Gauge className="w-3.5 h-3.5 text-indigo-500" /> Pressure</span>
                      <span className="font-semibold text-slate-800">{data.features.pressure?.toFixed(0) || '—'} hPa</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Regime Probabilities Card */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <BarChart2 className="w-5 h-5 text-blue-600" />
              <h3 className="text-base font-bold text-slate-800">Regime Probabilities</h3>
            </div>
            <p className="text-xs text-slate-500">
              Confidence levels calculated across the 6 meteorological regimes:
            </p>
            <div className="space-y-3 pt-2">
              {probEntries.map(([regime, prob], idx) => (
                <ProbBar key={regime} regime={regime} probability={prob} isTop={idx === 0} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
