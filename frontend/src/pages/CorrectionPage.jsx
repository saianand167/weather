import React, { useState, useEffect, useCallback } from 'react';
import {
  FlaskConical, CloudRain, ArrowRight, ArrowUp, ArrowDown,
  RefreshCw, AlertCircle, CheckCircle2, Info, Clock
} from 'lucide-react';
import LocationSelector from '../components/LocationSelector';
import { apiService } from '../services/api';

function RainfallCompare({ raw, corrected, delta, forecastTime }) {
  const improved = delta !== 0;
  const up = delta > 0;
  return (
    <div className="space-y-4">
      {forecastTime && (
        <div className="flex flex-wrap items-center justify-between bg-slate-50 border border-slate-200/80 rounded-xl px-4 py-2.5 text-xs">
          <div className="flex items-center gap-1.5 text-slate-500 font-semibold uppercase tracking-wider">
            <Clock className="w-4 h-4 text-emerald-600" />
            <span>Forecast Time:</span>
          </div>
          <span className="font-bold font-mono text-slate-800 bg-white px-3 py-1 rounded-lg border border-slate-200 shadow-2xs">
            {forecastTime}
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-0 border border-slate-200 rounded-2xl overflow-hidden text-center bg-white shadow-xs">
        <div className="bg-slate-50 py-4 sm:py-6 px-3 sm:px-4 border-b sm:border-b-0 sm:border-r border-slate-200">
          <div className="text-[11px] sm:text-xs text-slate-500 uppercase tracking-wider mb-1.5 sm:mb-2 font-semibold">Raw NWP Forecast</div>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-slate-700">{raw.toFixed(2)}</div>
          <div className="text-xs text-slate-400 mt-0.5 sm:mt-1">mm</div>
        </div>
        <div className="flex flex-col items-center justify-center py-4 sm:py-6 px-2 bg-slate-50/50 border-b sm:border-b-0 border-slate-200">
          <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center mb-1 sm:mb-1.5 ${
            improved ? (up ? 'bg-blue-100' : 'bg-amber-100') : 'bg-slate-100'
          }`}>
            {improved ? (up ? <ArrowUp className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" /> : <ArrowDown className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" />) : <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400" />}
          </div>
          <div className={`text-sm sm:text-base font-bold font-mono ${up ? 'text-blue-600' : delta < 0 ? 'text-amber-600' : 'text-slate-400'}`}>
            {delta > 0 ? '+' : ''}{delta.toFixed(2)} mm
          </div>
          <div className="text-[10px] sm:text-[11px] text-slate-500 font-medium mt-0.5">Correction Delta</div>
        </div>
        <div className="bg-blue-50/60 py-4 sm:py-6 px-3 sm:px-4 sm:border-l border-slate-200">
          <div className="text-[11px] sm:text-xs text-blue-600 uppercase tracking-wider mb-1.5 sm:mb-2 font-semibold">Corrected Forecast</div>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-blue-700">{corrected.toFixed(2)}</div>
          <div className="text-xs text-blue-400 mt-0.5 sm:mt-1">mm</div>
        </div>
      </div>
    </div>
  );
}

export default function CorrectionPage({ selectedLocation, onLocationChange, liveWeather }) {
  const [data, setData] = useState(null);
  const [selectedTime, setSelectedTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchCorrection = useCallback(async (loc, targetTime = null) => {
    if (!loc || !loc.latitude || !loc.longitude) return;
    setLoading(true);
    setError(null);
    try {
      const result = await apiService.getCorrectedForecast({
        lat: loc.latitude,
        lon: loc.longitude,
        district: loc.district,
        state: loc.state,
        threshold: 25.0,
        target_time: targetTime,
        liveWeather,
      });
      setData(result);
      if (result.forecast_time) {
        setSelectedTime(result.forecast_time);
      }
    } catch (err) {
      setError(err.message || 'ML correction calculation failed.');
    } finally {
      setLoading(false);
    }
  }, [liveWeather]);

  useEffect(() => {
    if (selectedLocation && selectedLocation.district) {
      setSelectedTime('');
      fetchCorrection(selectedLocation);
    }
  }, [selectedLocation?.district, selectedLocation?.state, fetchCorrection]);

  const handleLocationChange = (loc) => {
    setSelectedTime('');
    onLocationChange(loc);
    fetchCorrection(loc);
  };

  const handleTimeChange = (time) => {
    setSelectedTime(time);
    fetchCorrection(selectedLocation, time);
  };

  const handleRun = () => fetchCorrection(selectedLocation, selectedTime || null);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-700 via-teal-600 to-cyan-600 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur">
            <FlaskConical className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold">AI Rainfall Bias Correction</h1>
            <p className="text-emerald-100 text-xs">Regime-Specific Post-Processing of Numerical Weather Predictions</p>
          </div>
        </div>
        <p className="text-sm text-emerald-100 leading-relaxed">
          Post-processes baseline NWP hourly forecasts using regime-stratified machine learning to eliminate documented systematic bias over the selected Indian district.
        </p>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <LocationSelector
            selectedLocation={selectedLocation}
            onLocationChange={handleLocationChange}
            disabled={loading}
          />
        </div>
        <button
          id="btn-run-correction"
          onClick={handleRun}
          disabled={loading}
          className="flex items-center justify-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-sm transition-all disabled:opacity-60 shadow-md"
        >
          {loading ? (
            <><RefreshCw className="w-4 h-4 animate-spin" /> Recalculating…</>
          ) : (
            <><FlaskConical className="w-4 h-4" /> Recalculate Correction</>
          )}
        </button>
      </div>

      {/* Error */}
      {error && !loading && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold">Correction Unavailable</div>
            <div className="text-xs mt-0.5">{error}</div>
          </div>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 animate-pulse space-y-4">
          <div className="h-6 bg-slate-200 rounded w-1/4" />
          <div className="h-28 bg-slate-100 rounded-xl" />
          <div className="h-16 bg-slate-100 rounded-xl" />
        </div>
      )}

      {/* Correction Results */}
      {data && !loading && (
        <div className="space-y-6">
          {/* Main Comparison Component */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <CloudRain className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-800">
                  {selectedLocation.district}, {selectedLocation.state}
                </h3>
              </div>
              <span className="text-xs text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1 rounded-full font-semibold">
                Regime: {data.regime_used}
              </span>
            </div>

            {/* Forecast Hour Selector */}
            {data.available_forecasts && data.available_forecasts.length > 0 && (
              <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 bg-slate-50 border border-slate-200/90 rounded-xl p-3">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 shrink-0">
                  <Clock className="w-4 h-4 text-emerald-600" />
                  <span>Select Forecast Period:</span>
                </div>
                <select
                  id="forecast-period-select"
                  value={selectedTime || data.forecast_time || ''}
                  onChange={(e) => handleTimeChange(e.target.value)}
                  disabled={loading}
                  className="w-full text-xs font-mono font-medium text-slate-800 bg-white border border-slate-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors shadow-2xs"
                >
                  {data.available_forecasts.map((slot) => (
                    <option key={slot.timestamp} value={slot.timestamp}>
                      {slot.formatted_time} — Raw NWP: {slot.rainfall_mm.toFixed(2)} mm {slot.rainfall_mm > 0 ? '🌧️' : '☁️'}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <RainfallCompare
              raw={data.raw_rainfall_mm}
              corrected={data.corrected_rainfall_mm}
              delta={data.delta_mm}
              forecastTime={data.forecast_time_formatted}
            />

            {/* Simple explanation */}
            <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-4">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 mb-1.5">
                <Info className="w-4 h-4 text-emerald-700 shrink-0" />
                Explanation of Correction
              </div>
              <p className="text-xs text-emerald-900 leading-relaxed font-normal">
                {data.explanation}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
