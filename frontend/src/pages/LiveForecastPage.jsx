import React, { useState } from 'react';
import { 
  CloudRain, 
  Thermometer, 
  Droplets, 
  Wind, 
  Gauge, 
  Clock, 
  Calendar,
  Filter,
  Compass
} from 'lucide-react';
import LiveStatusBadge from '../components/LiveStatusBadge';
import LocationSelector from '../components/LocationSelector';
import ForecastChart from '../charts/ForecastChart';
import SkeletonLoader from '../components/SkeletonLoader';
import ErrorMessage from '../components/ErrorMessage';

export default function LiveForecastPage({
  selectedLocation,
  onLocationChange,
  forecastData,
  loading,
  error,
  onRefresh,
  isRefreshing
}) {
  const [filterRainOnly, setFilterRainOnly] = useState(false);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0); // 0 = Day 1, 1 = Day 2, 2 = Day 3

  const hourly = forecastData?.hourly || [];
  const daily = forecastData?.daily || [];

  // Group hourly data by date
  const dayGroups = {};
  hourly.forEach((item) => {
    const dateKey = item.timestamp.split('T')[0];
    if (!dayGroups[dateKey]) dayGroups[dateKey] = [];
    dayGroups[dateKey].push(item);
  });

  const availableDates = Object.keys(dayGroups);
  const activeDate = availableDates[selectedDayIndex] || availableDates[0];
  const activeHourlyItems = (dayGroups[activeDate] || []).filter((item) => {
    if (filterRainOnly) {
      return item.rainfall !== null && item.rainfall > 0;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Status & Location Bar */}
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

      {error && !loading && (
        <ErrorMessage
          message="Live data currently unavailable."
          subMessage="Unable to retrieve forecast records from the configured meteorological server. Please verify your connection or retry."
          onRetry={onRefresh}
          isRetrying={isRefreshing}
        />
      )}

      {loading && !error && (
        <div className="space-y-6">
          <SkeletonLoader type="chart" />
          <SkeletonLoader type="table" />
        </div>
      )}

      {!loading && !error && forecastData && (
        <>
          {/* Main Visual Forecast Chart */}
          <ForecastChart
            hourlyData={forecastData.hourly}
            dailyData={forecastData.daily}
            title="Hourly Precipitation & Temperature Trajectory"
          />

          {/* Dedicated Tabular Forecast Horizon */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
            {/* Header with Day Selector & Filters */}
            <div className="p-5 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-700" />
                  Detailed Hourly NWP Model Output
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Verified model predictions for {selectedLocation.district}, {selectedLocation.state}
                </p>
              </div>

              {/* Day Selection Tabs & Rain Filter */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex bg-slate-100 p-1 rounded-lg text-xs font-medium text-slate-600">
                  {availableDates.slice(0, 3).map((dStr, idx) => (
                    <button
                      key={dStr}
                      onClick={() => setSelectedDayIndex(idx)}
                      className={`px-3 py-1 rounded-md transition-all ${
                        selectedDayIndex === idx
                          ? 'bg-white text-blue-700 font-bold shadow-xs'
                          : 'hover:text-slate-900'
                      }`}
                    >
                      {new Date(dStr).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
                    </button>
                  ))}
                </div>

                <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100">
                  <input
                    type="checkbox"
                    checked={filterRainOnly}
                    onChange={(e) => setFilterRainOnly(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>Rain hours only</span>
                </label>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Valid Time (IST)</th>
                    <th className="py-3 px-4">Weather Condition</th>
                    <th className="py-3 px-4 text-right">Precipitation (mm)</th>
                    <th className="py-3 px-4 text-right">Temperature (°C)</th>
                    <th className="py-3 px-4 text-right">Humidity (%)</th>
                    <th className="py-3 px-4 text-right">Surface Pressure (hPa)</th>
                    <th className="py-3 px-4 text-right">Wind Vector</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activeHourlyItems.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        {filterRainOnly 
                          ? "No rainfall forecast during this 24-hour cycle."
                          : "No forecast periods available for this date."}
                      </td>
                    </tr>
                  ) : (
                    activeHourlyItems.map((item, i) => {
                      const timeStr = item.timestamp.split('T')[1]?.slice(0, 5) || item.timestamp;
                      const hasRain = item.rainfall !== null && item.rainfall > 0;
                      return (
                        <tr 
                          key={item.timestamp}
                          className={`hover:bg-slate-50/80 transition-colors ${
                            hasRain ? 'bg-blue-50/40' : ''
                          }`}
                        >
                          <td className="py-3 px-4 font-mono font-medium text-slate-800">
                            {timeStr} hrs
                          </td>
                          <td className="py-3 px-4 text-slate-600">
                            {item.weather_description || "Clear / Stable"}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold">
                            {item.rainfall !== null ? (
                              <span className={hasRain ? "text-blue-700" : "text-slate-400"}>
                                {item.rainfall.toFixed(2)} mm
                              </span>
                            ) : "—"}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-slate-700">
                            {item.temperature !== null ? `${item.temperature.toFixed(1)} °C` : "—"}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-slate-600">
                            {item.humidity !== null ? `${item.humidity} %` : "—"}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-slate-600">
                            {item.pressure !== null ? `${item.pressure.toFixed(1)} hPa` : "—"}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-slate-600">
                            {item.wind_speed !== null ? (
                              <span>
                                {item.wind_speed.toFixed(1)} km/h {item.wind_direction !== null ? `(${item.wind_direction}°)` : ''}
                              </span>
                            ) : "—"}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Footer info */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-500 flex items-center justify-between">
              <span>Showing {activeHourlyItems.length} hourly forecast steps</span>
              <span>Model Grid: Lat {forecastData.latitude.toFixed(4)}°, Lon {forecastData.longitude.toFixed(4)}°</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
