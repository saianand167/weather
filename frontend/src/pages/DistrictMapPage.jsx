import React from 'react';
import { MapPin, Compass, CloudRain, Thermometer, Droplets, Wind, Gauge, ExternalLink } from 'lucide-react';
import IndiaMap from '../map/IndiaMap';
import LocationSelector from '../components/LocationSelector';
import LiveStatusBadge from '../components/LiveStatusBadge';
import SkeletonLoader from '../components/SkeletonLoader';
import ErrorMessage from '../components/ErrorMessage';

export default function DistrictMapPage({
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

  return (
    <div className="space-y-6">
      {/* Top Controls */}
      <LiveStatusBadge
        isConnected={!error && forecastData?.current?.is_live}
        lastUpdated={forecastData?.last_updated}
        source={forecastData?.source || "Open-Meteo NWP (ECMWF/GFS)"}
        onRefresh={onRefresh}
        isRefreshing={isRefreshing}
      />

      <LocationSelector
        selectedLocation={selectedLocation}
        onLocationChange={onLocationChange}
        disabled={loading || isRefreshing}
      />

      {/* Main Map View + District Inspector Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Interactive Map (2 Columns) */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">
              Interactive National Geospatial Grid
            </h3>
            <span className="text-xs text-slate-500">
              Click any district point to inspect live NWP data
            </span>
          </div>

          <IndiaMap
            selectedLocation={selectedLocation}
            onSelectDistrict={onLocationChange}
            currentWeather={current}
            height="580px"
          />
        </div>

        {/* Selected District Details & Live Meteorological Panel (1 Column) */}
        <div className="space-y-4">
          <div className="bg-white p-5 border border-slate-200 rounded-xl shadow-xs space-y-4">
            <div className="pb-3 border-b border-slate-100">
              <div className="text-[10px] font-bold uppercase tracking-wider text-blue-700 mb-1">
                District Observation Details
              </div>
              <h3 className="text-xl font-bold text-slate-900 leading-tight">
                {selectedLocation.district || "Select District"}
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                {selectedLocation.state}
              </p>
            </div>

            {/* Coordinates Reference */}
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Latitude:</span>
                <span className="font-mono font-semibold text-slate-800">
                  {selectedLocation.latitude ? Number(selectedLocation.latitude).toFixed(4) : "—"}° N
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Longitude:</span>
                <span className="font-mono font-semibold text-slate-800">
                  {selectedLocation.longitude ? Number(selectedLocation.longitude).toFixed(4) : "—"}° E
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Spatial Method:</span>
                <span className="text-slate-700 font-medium">Representative NWP Coordinate</span>
              </div>
            </div>

            {loading && <SkeletonLoader type="card" count={2} />}

            {error && !loading && (
              <ErrorMessage
                message="Live data unavailable"
                subMessage="Could not retrieve observation for this coordinate."
                onRetry={onRefresh}
                isRetrying={isRefreshing}
              />
            )}

            {!loading && !error && current && (
              <div className="space-y-3">
                <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CloudRain className="w-5 h-5 text-blue-700" />
                    <div>
                      <div className="text-[10px] uppercase font-bold text-blue-800">Live Rainfall</div>
                      <div className="text-base font-bold font-mono text-blue-900">
                        {current.rainfall !== null ? `${current.rainfall} mm` : "0.0 mm"}
                      </div>
                    </div>
                  </div>
                  <span className="text-[11px] font-medium text-blue-700 bg-white px-2 py-0.5 rounded border border-blue-200">
                    Live NWP
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg">
                    <div className="text-slate-400 text-[10px] uppercase">Temperature</div>
                    <div className="text-base font-bold text-slate-800 font-mono">
                      {current.temperature !== null ? `${current.temperature} °C` : "—"}
                    </div>
                    <div className="text-[10px] text-slate-500 truncate">
                      {current.weather_description || "Clear"}
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg">
                    <div className="text-slate-400 text-[10px] uppercase">Humidity</div>
                    <div className="text-base font-bold text-slate-800 font-mono">
                      {current.humidity !== null ? `${current.humidity} %` : "—"}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Relative saturation
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg">
                    <div className="text-slate-400 text-[10px] uppercase">Wind Speed</div>
                    <div className="text-base font-bold text-slate-800 font-mono">
                      {current.wind_speed !== null ? `${current.wind_speed} km/h` : "—"}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Dir: {current.wind_direction !== null ? `${current.wind_direction}°` : '—'}
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg">
                    <div className="text-slate-400 text-[10px] uppercase">Surface Pressure</div>
                    <div className="text-base font-bold text-slate-800 font-mono">
                      {current.pressure !== null ? `${current.pressure} hPa` : "—"}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Atmospheric
                    </div>
                  </div>
                </div>

                <div className="pt-2 text-[10px] text-slate-400 flex items-center justify-between border-t border-slate-100">
                  <span>Data Timestamp:</span>
                  <span className="font-mono">{current.timestamp?.replace('T', ' ')}</span>
                </div>

                <button
                  onClick={() => onNavigate('forecast')}
                  className="w-full mt-2 flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  View 3-Day Hourly Trajectory
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
