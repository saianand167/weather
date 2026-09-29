import React, { useState, useEffect, useCallback } from 'react';
import {
  TriangleAlert, CloudRain, RefreshCw, AlertCircle,
  Clock, MapPin, Gauge, ShieldAlert, Info, ArrowRight
} from 'lucide-react';
import LocationSelector from '../components/LocationSelector';
import { apiService } from '../services/api';

const RISK_COLORS = {
  'LOW':       { bg: 'bg-emerald-50', border: 'border-emerald-300', text: 'text-emerald-800', badge: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
  'MODERATE':  { bg: 'bg-amber-50',   border: 'border-amber-300',   text: 'text-amber-800',   badge: 'bg-amber-100   text-amber-700   border-amber-300'   },
  'HIGH':      { bg: 'bg-orange-50',  border: 'border-orange-300',  text: 'text-orange-800',  badge: 'bg-orange-100  text-orange-700  border-orange-300'  },
  'VERY HIGH': { bg: 'bg-red-50',     border: 'border-red-300',     text: 'text-red-800',     badge: 'bg-red-100     text-red-700     border-red-300'     },
  'EXTREME':   { bg: 'bg-purple-50',  border: 'border-purple-300',  text: 'text-purple-800',  badge: 'bg-purple-100  text-purple-700  border-purple-300'  },
};

function ProbabilityGauge({ probability }) {
  const pct = Math.round(probability * 100);
  const color = pct >= 70 ? '#dc2626' : pct >= 40 ? '#ea580c' : pct >= 20 ? '#d97706' : '#16a34a';
  return (
    <div className="relative w-48 h-24 mx-auto">
      <svg viewBox="0 0 120 65" className="w-full h-full">
        <path d="M10 60 A50 50 0 0 1 110 60" fill="none" stroke="#e2e8f0" strokeWidth="12" strokeLinecap="round" />
        <path
          d="M10 60 A50 50 0 0 1 110 60"
          fill="none"
          stroke={color}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={`${(pct / 100) * 157} 157`}
        />
        <text x="60" y="56" textAnchor="middle" fontSize="20" fontWeight="bold" fill={color}>{pct}%</text>
      </svg>
    </div>
  );
}

export default function HeavyRainfallRiskPage({ selectedLocation, onLocationChange, liveWeather }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [threshold, setThreshold] = useState(25.0);

  const fetchRisk = useCallback(async (loc, targetThreshold) => {
    if (!loc || !loc.latitude || !loc.longitude) return;
    setLoading(true);
    setError(null);
    try {
      const result = await apiService.getCorrectedForecast({
        lat: loc.latitude,
        lon: loc.longitude,
        district: loc.district,
        state: loc.state,
        threshold: targetThreshold !== undefined ? targetThreshold : threshold,
        liveWeather,
      });
      setData(result);
    } catch (err) {
      setError(err.message || 'Failed to calculate heavy rainfall risk.');
    } finally {
      setLoading(false);
    }
  }, [threshold, liveWeather]);

  useEffect(() => {
    if (selectedLocation && selectedLocation.district) {
      fetchRisk(selectedLocation, threshold);
    }
  }, [selectedLocation?.district, selectedLocation?.state, threshold, fetchRisk]);

  const handleLocationChange = (loc) => {
    onLocationChange(loc);
    fetchRisk(loc, threshold);
  };

  const riskMeta = data ? (RISK_COLORS[data.heavy_rain_risk_level] || RISK_COLORS['LOW']) : RISK_COLORS['LOW'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur">
            <TriangleAlert className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold">Heavy Rainfall Risk Intelligence</h1>
            <p className="text-orange-100 text-xs">Exceedance Probability & Risk Assessment for Extreme Precipitation</p>
          </div>
        </div>
        <p className="text-sm text-orange-100 leading-relaxed">
          Evaluates the probability of rainfall exceeding critical impact thresholds for the selected district based on regime-calibrated post-processed predictions.
        </p>
      </div>

      {/* Location & Threshold Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <LocationSelector
            selectedLocation={selectedLocation}
            onLocationChange={handleLocationChange}
            disabled={loading}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1.5">Rainfall Exceedance Threshold</label>
          <select
            value={threshold}
            onChange={(e) => setThreshold(parseFloat(e.target.value))}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white text-slate-800 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          >
            <option value={15}>15 mm — Moderate Rain</option>
            <option value={25}>25 mm — Heavy Rain Alert (IMD)</option>
            <option value={35}>35 mm — Significant Rainfall</option>
            <option value={50}>50 mm — Very Heavy Rain</option>
            <option value={75}>75 mm — Severe Downpour</option>
            <option value={100}>100 mm — Extreme Torrential Rain</option>
          </select>
        </div>
      </div>

      {/* Error state */}
      {error && !loading && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold">Unable to Calculate Risk</div>
            <div className="text-xs mt-0.5">{error}</div>
          </div>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 animate-pulse h-64 space-y-4">
            <div className="h-6 bg-slate-200 rounded w-1/3" />
            <div className="h-24 bg-slate-100 rounded-full w-48 mx-auto" />
            <div className="h-4 bg-slate-200 rounded w-2/3 mx-auto" />
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-6 animate-pulse h-64 space-y-4">
            <div className="h-6 bg-slate-200 rounded w-1/3" />
            <div className="h-10 bg-slate-100 rounded" />
            <div className="h-10 bg-slate-100 rounded" />
          </div>
        </div>
      )}

      {/* Risk Assessment Results */}
      {data && !loading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Main Risk Gauge Card */}
          <div className={`border rounded-2xl shadow-sm overflow-hidden p-6 ${riskMeta.bg} ${riskMeta.border}`}>
            <div className="flex items-center justify-between pb-4 border-b border-black/5">
              <div className="flex items-center gap-2">
                <ShieldAlert className={`w-5 h-5 ${riskMeta.text}`} />
                <h3 className={`text-base font-bold ${riskMeta.text}`}>Risk Assessment</h3>
              </div>
              <span className={`text-xs font-bold px-3 py-1 rounded-full border ${riskMeta.badge}`}>
                {data.heavy_rain_risk_level}
              </span>
            </div>

            <div className="py-6 text-center space-y-4">
              <ProbabilityGauge probability={data.heavy_rain_probability} />
              <div>
                <div className={`text-2xl font-bold font-mono ${riskMeta.text}`}>
                  {(data.heavy_rain_probability * 100).toFixed(1)}%
                </div>
                <div className="text-xs text-slate-600 mt-1 font-medium">
                  Probability of exceeding {data.threshold_mm} mm rainfall
                </div>
              </div>
            </div>

            <div className="bg-white/80 rounded-xl p-4 border border-white/90 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Selected Location:</span>
                <span className="font-semibold text-slate-800">{selectedLocation.district}, {selectedLocation.state}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Exceedance Threshold:</span>
                <span className="font-mono font-bold text-slate-800">{data.threshold_mm} mm</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Active Regime:</span>
                <span className="font-medium text-slate-700">{data.regime_used}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Forecast Horizon:</span>
                <span className="font-medium text-slate-700">Next 24 Hours</span>
              </div>
            </div>
          </div>

          {/* Context & Rainfall Amounts Card */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-5">
            <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
              <CloudRain className="w-5 h-5 text-blue-600" />
              <h3 className="text-base font-bold text-slate-800">Rainfall Quantities</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="text-xs text-slate-500 mb-1">Raw NWP Forecast</div>
                <div className="text-xl sm:text-2xl font-bold font-mono text-slate-700">
                  {data.raw_rainfall_mm.toFixed(2)} <span className="text-xs text-slate-400 font-normal">mm</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-1">Uncorrected model output</div>
              </div>

              <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
                <div className="text-xs text-blue-600 mb-1 font-medium">ML Corrected Forecast</div>
                <div className="text-xl sm:text-2xl font-bold font-mono text-blue-700">
                  {data.corrected_rainfall_mm.toFixed(2)} <span className="text-xs text-blue-400 font-normal">mm</span>
                </div>
                <div className="text-[11px] text-blue-500 mt-1">Regime-adjusted forecast</div>
              </div>
            </div>

            {/* Meteorological explanation */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-800 mb-1.5">
                <Info className="w-4 h-4 text-amber-700 shrink-0" />
                Risk Diagnostic Summary
              </div>
              <p className="text-xs text-amber-900 leading-relaxed">
                {data.heavy_rain_probability > 0.5
                  ? `High probability of heavy rainfall detected under ${data.regime_used} conditions. Atmospheric instability and moisture flux favor precipitation reaching or exceeding ${data.threshold_mm} mm.`
                  : data.heavy_rain_probability > 0.2
                  ? `Moderate possibility of localized heavy showers exceeding ${data.threshold_mm} mm. Convective development should be monitored.`
                  : `Low likelihood of exceeding ${data.threshold_mm} mm within the forecast window under ${data.regime_used} dynamics.`}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
