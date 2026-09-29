import React, { useState, useEffect } from 'react';
import { 
  CloudRain, 
  Thermometer, 
  Droplets, 
  Wind, 
  Gauge, 
  MapPin, 
  Calendar,
  BrainCircuit,
  FlaskConical,
  TriangleAlert,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import LiveStatusBadge from '../components/LiveStatusBadge';
import LocationSelector from '../components/LocationSelector';
import WeatherMetricCard from '../components/WeatherMetricCard';
import ForecastChart from '../charts/ForecastChart';
import IndiaMap from '../map/IndiaMap';
import SkeletonLoader from '../components/SkeletonLoader';
import ErrorMessage from '../components/ErrorMessage';
import { apiService } from '../services/api';

export default function DashboardPage({
  selectedLocation,
  onLocationChange,
  forecastData,
  loading,
  error,
  onRefresh,
  isRefreshing,
  onNavigate
}) {
  const current = forecastData?.current;

  // Supplementary ML summary states for the Dashboard
  const [mlSummary, setMlSummary] = useState({
    regime: null,
    confidence: null,
    rawRainfall: null,
    correctedRainfall: null,
    delta: null,
    riskLevel: null,
    riskProbability: null,
    loading: false
  });

  useEffect(() => {
    let isCancelled = false;
    async function loadMlSummary() {
      if (!selectedLocation || !selectedLocation.latitude || !selectedLocation.longitude) return;
      setMlSummary(prev => ({ ...prev, loading: true }));
      try {
        const [regimeRes, correctionRes] = await Promise.allSettled([
          apiService.getRegimeClassification({
            lat: selectedLocation.latitude,
            lon: selectedLocation.longitude,
            district: selectedLocation.district,
            state: selectedLocation.state
          }),
          apiService.getCorrectedForecast({
            lat: selectedLocation.latitude,
            lon: selectedLocation.longitude,
            district: selectedLocation.district,
            state: selectedLocation.state,
            threshold: 25.0
          })
        ]);

        if (isCancelled) return;

        const regime = regimeRes.status === 'fulfilled' ? regimeRes.value : null;
        const correction = correctionRes.status === 'fulfilled' ? correctionRes.value : null;

        setMlSummary({
          regime: regime?.predicted_regime || 'Active Monsoon',
          confidence: regime?.confidence != null ? Math.round(regime.confidence * 100) : null,
          rawRainfall: correction?.raw_rainfall_mm ?? (current?.rainfall || 0.0),
          correctedRainfall: correction?.corrected_rainfall_mm ?? (current?.rainfall || 0.0),
          delta: correction?.delta_mm ?? 0.0,
          riskLevel: correction?.heavy_rain_risk_level || 'LOW',
          riskProbability: correction?.heavy_rain_probability != null ? Math.round(correction.heavy_rain_probability * 100) : null,
          loading: false
        });
      } catch (_) {
        if (!isCancelled) setMlSummary(prev => ({ ...prev, loading: false }));
      }
    }

    loadMlSummary();
    return () => { isCancelled = true; };
  }, [selectedLocation?.district, selectedLocation?.state, selectedLocation?.latitude, selectedLocation?.longitude, current?.rainfall]);

  return (
    <div className="space-y-6">
      {/* 1. Live Data Status Header */}
      <LiveStatusBadge
        isConnected={!error && forecastData?.current?.is_live}
        lastUpdated={forecastData?.last_updated}
        source={forecastData?.source || "Open-Meteo NWP (ECMWF/GFS)"}
        onRefresh={onRefresh}
        isRefreshing={isRefreshing}
      />

      {/* 2. Location Selector */}
      <LocationSelector
        selectedLocation={selectedLocation}
        onLocationChange={onLocationChange}
        disabled={loading || isRefreshing}
      />

      {/* Error state */}
      {error && !loading && (
        <ErrorMessage
          message="Live data currently unavailable."
          subMessage="Unable to retrieve live forecast from the configured NWP provider. Please check your network or try again."
          onRetry={onRefresh}
          isRetrying={isRefreshing}
        />
      )}

      {/* Loading Skeleton */}
      {loading && !error && (
        <div className="space-y-6">
          <SkeletonLoader type="card" count={4} />
          <SkeletonLoader type="chart" />
        </div>
      )}

      {/* Main Content when data is available */}
      {!loading && !error && current && (
        <>
          {/* Key Weather Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <WeatherMetricCard
              title="Current Rainfall"
              value={current.rainfall !== null ? current.rainfall : 0.0}
              unit="mm"
              icon={CloudRain}
              statusColor={current.rainfall > 0 ? "blue" : "slate"}
              subtitle={current.rainfall > 0 ? "Active Precipitation" : "Dry Conditions"}
              helperText="NWP 15-minute precipitation rate"
            />
            <WeatherMetricCard
              title="Temperature"
              value={current.temperature}
              unit="°C"
              icon={Thermometer}
              statusColor="amber"
              subtitle={current.weather_description || "Ambient Condition"}
              helperText="Surface 2m observation"
            />
            <WeatherMetricCard
              title="Relative Humidity"
              value={current.humidity}
              unit="%"
              icon={Droplets}
              statusColor="indigo"
              subtitle={current.humidity > 75 ? "High Moisture" : "Moderate Humidity"}
              helperText="Water vapor saturation"
            />
            <WeatherMetricCard
              title="Wind Speed & Pressure"
              value={current.wind_speed}
              unit="km/h"
              icon={Wind}
              statusColor="sky"
              subtitle={current.pressure ? `${current.pressure} hPa surface` : "Normal pressure"}
              helperText={`Vector direction: ${current.wind_direction !== null ? current.wind_direction + '°' : '—'}`}
            />
          </div>

          {/* AI Intelligence Summary Row (Regime, Correction, Risk) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Regime Card */}
            <div
              onClick={() => onNavigate && onNavigate('regime')}
              className="bg-white border border-slate-200 rounded-xl p-4.5 shadow-2xs hover:border-blue-300 hover:shadow-xs cursor-pointer transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between text-xs text-slate-500 font-medium mb-1">
                  <span className="flex items-center gap-1.5 text-blue-700 font-semibold uppercase tracking-wider text-[11px]">
                    <BrainCircuit className="w-3.5 h-3.5" /> Weather Regime
                  </span>
                  {mlSummary.confidence != null && (
                    <span className="font-mono text-slate-400">{mlSummary.confidence}% confidence</span>
                  )}
                </div>
                <div className="text-base font-bold text-slate-800 mt-1">
                  {mlSummary.regime || "Classifying..."}
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Synoptic atmospheric pattern driving local rainfall
                </p>
              </div>
              <div className="flex items-center text-xs font-semibold text-blue-600 mt-3">
                View regime details <ArrowRight className="w-3 h-3 ml-1" />
              </div>
            </div>

            {/* AI Correction Card */}
            <div
              onClick={() => onNavigate && onNavigate('correction')}
              className="bg-white border border-slate-200 rounded-xl p-4.5 shadow-2xs hover:border-emerald-300 hover:shadow-xs cursor-pointer transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between text-xs text-slate-500 font-medium mb-1">
                  <span className="flex items-center gap-1.5 text-emerald-700 font-semibold uppercase tracking-wider text-[11px]">
                    <FlaskConical className="w-3.5 h-3.5" /> AI Bias Correction
                  </span>
                  {mlSummary.delta !== null && (
                    <span className={`font-mono font-bold text-[11px] ${mlSummary.delta > 0 ? 'text-blue-600' : mlSummary.delta < 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                      {mlSummary.delta > 0 ? '+' : ''}{mlSummary.delta.toFixed(2)} mm
                    </span>
                  )}
                </div>
                <div className="text-base font-bold text-slate-800 mt-1">
                  {mlSummary.correctedRainfall !== null ? `${mlSummary.correctedRainfall.toFixed(2)} mm corrected` : "Calculating..."}
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Raw forecast: {mlSummary.rawRainfall !== null ? `${mlSummary.rawRainfall.toFixed(2)} mm` : "—"}
                </p>
              </div>
              <div className="flex items-center text-xs font-semibold text-emerald-600 mt-3">
                Inspect correction <ArrowRight className="w-3 h-3 ml-1" />
              </div>
            </div>

            {/* Heavy Rain Risk Card */}
            <div
              onClick={() => onNavigate && onNavigate('risk')}
              className="bg-white border border-slate-200 rounded-xl p-4.5 shadow-2xs hover:border-amber-300 hover:shadow-xs cursor-pointer transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between text-xs text-slate-500 font-medium mb-1">
                  <span className="flex items-center gap-1.5 text-amber-700 font-semibold uppercase tracking-wider text-[11px]">
                    <TriangleAlert className="w-3.5 h-3.5" /> Heavy Rain Risk
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    mlSummary.riskLevel === 'HIGH' || mlSummary.riskLevel === 'VERY HIGH' || mlSummary.riskLevel === 'EXTREME'
                      ? 'bg-red-100 text-red-700'
                      : mlSummary.riskLevel === 'MODERATE'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {mlSummary.riskLevel || 'LOW'}
                  </span>
                </div>
                <div className="text-base font-bold text-slate-800 mt-1">
                  {mlSummary.riskProbability !== null ? `${mlSummary.riskProbability}% exceedance prob.` : "Assessing..."}
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Threshold: 25 mm / 24h impact alert
                </p>
              </div>
              <div className="flex items-center text-xs font-semibold text-amber-600 mt-3">
                Check heavy rain risk <ArrowRight className="w-3 h-3 ml-1" />
              </div>
            </div>
          </div>

          {/* Forecast Chart & Map Preview Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Forecast Chart (Takes 2 columns) */}
            <div className="lg:col-span-2 space-y-4">
              <ForecastChart
                hourlyData={forecastData.hourly}
                dailyData={forecastData.daily}
                title="Precipitation Forecast"
              />

              {/* Quick Daily Overview Row */}
              <div className="bg-white p-5 border border-slate-200 rounded-xl shadow-xs">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-blue-700" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      3-Day Forecast Outlook
                    </h4>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    Model Run Horizon
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {(forecastData.daily || []).map((day) => (
                    <div key={day.date} className="p-3 bg-slate-50 border border-slate-100 rounded-lg">
                      <div className="text-xs font-semibold text-slate-700">
                        {new Date(day.date).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
                      </div>
                      <div className="mt-1 flex items-baseline justify-between">
                        <span className="text-xs text-slate-500">Rainfall:</span>
                        <span className="text-sm font-bold font-mono text-blue-700">
                          {day.total_rainfall !== null ? `${day.total_rainfall} mm` : "0 mm"}
                        </span>
                      </div>
                      <div className="mt-0.5 flex items-baseline justify-between text-[11px] text-slate-500">
                        <span>Temp:</span>
                        <span className="font-mono">
                          {day.temp_min}° – {day.temp_max}°C
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Interactive Map Preview (Takes 1 column) */}
            <div className="space-y-3 flex flex-col">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Spatial Reference
                </h4>
                <button
                  onClick={() => onNavigate('map')}
                  className="text-xs font-semibold text-blue-700 hover:text-blue-800 transition-colors"
                >
                  Open Full Map &rarr;
                </button>
              </div>

              <div className="flex-1 min-h-[380px]">
                <IndiaMap
                  selectedLocation={selectedLocation}
                  onSelectDistrict={onLocationChange}
                  currentWeather={current}
                  height="100%"
                />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
