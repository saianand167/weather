import React, { useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid
} from 'recharts';
import { CloudRain, Calendar, Clock } from 'lucide-react';

export default function ForecastChart({
  hourlyData = [],
  dailyData = [],
  title = "Live Precipitation & Temperature Forecast"
}) {
  const [viewMode, setViewMode] = useState('hourly'); // 'hourly' | 'daily'

  // Format hourly data for Recharts (next 24-36 hours)
  const formattedHourly = (hourlyData || []).slice(0, 36).map(item => {
    let label = item.timestamp;
    try {
      const d = new Date(item.timestamp);
      label = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + 
        ' (' + d.toLocaleDateString([], { month: 'numeric', day: 'numeric' }) + ')';
    } catch (e) {
      // ignore
    }
    return {
      rawTime: item.timestamp,
      displayTime: label,
      rainfall: item.rainfall !== null && item.rainfall !== undefined ? Number(item.rainfall.toFixed(2)) : 0,
      temperature: item.temperature !== null && item.temperature !== undefined ? Number(item.temperature.toFixed(1)) : null,
      humidity: item.humidity,
      windSpeed: item.wind_speed,
      weatherDesc: item.weather_description
    };
  });

  // Format daily data for Recharts
  const formattedDaily = (dailyData || []).map(item => {
    let label = item.date;
    try {
      const d = new Date(item.date);
      label = d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
    } catch (e) {
      // ignore
    }
    return {
      rawTime: item.date,
      displayTime: label,
      rainfall: item.total_rainfall !== null && item.total_rainfall !== undefined ? Number(item.total_rainfall.toFixed(1)) : 0,
      tempMax: item.temp_max,
      tempMin: item.temp_min
    };
  });

  const chartData = viewMode === 'hourly' ? formattedHourly : formattedDaily;

  // Custom Tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const dataItem = payload[0].payload;
      return (
        <div className="bg-slate-900/95 text-white p-3 rounded-lg shadow-xl text-xs space-y-1.5 border border-slate-700 backdrop-blur-xs min-w-44">
          <div className="font-semibold text-slate-300 pb-1 border-b border-slate-700">
            {dataItem.displayTime}
          </div>
          {dataItem.weatherDesc && (
            <div className="text-slate-400 italic">
              {dataItem.weatherDesc}
            </div>
          )}
          <div className="flex items-center justify-between text-blue-300 font-mono">
            <span>Precipitation:</span>
            <span className="font-bold">{dataItem.rainfall} mm</span>
          </div>
          {viewMode === 'hourly' && dataItem.temperature !== null && (
            <div className="flex items-center justify-between text-amber-300 font-mono">
              <span>Temperature:</span>
              <span className="font-bold">{dataItem.temperature} °C</span>
            </div>
          )}
          {viewMode === 'daily' && (
            <div className="flex items-center justify-between text-amber-300 font-mono">
              <span>Temp Range:</span>
              <span className="font-bold">{dataItem.tempMin}° – {dataItem.tempMax}°C</span>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white p-3.5 sm:p-5 border border-slate-200 rounded-xl shadow-xs">
      {/* Chart Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-5">
        <div>
          <div className="flex items-center gap-2">
            <CloudRain className="w-4 h-4 text-blue-700" />
            <h3 className="text-xs sm:text-sm font-bold text-slate-900">
              {title}
            </h3>
          </div>
          <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
            Raw Numerical Weather Prediction (NWP) model outputs from Open-Meteo
          </p>
        </div>

        {/* View Toggle */}
        <div className="inline-flex p-1 bg-slate-100 rounded-lg text-xs font-medium text-slate-600 w-full sm:w-auto justify-between sm:justify-start">
          <button
            onClick={() => setViewMode('hourly')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-1 rounded-md transition-all text-[11px] sm:text-xs ${
              viewMode === 'hourly' 
                ? 'bg-white text-blue-700 shadow-xs font-semibold' 
                : 'hover:text-slate-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5" /> Hourly (Next 36h)
          </button>
          <button
            onClick={() => setViewMode('daily')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-1 rounded-md transition-all text-[11px] sm:text-xs ${
              viewMode === 'daily' 
                ? 'bg-white text-blue-700 shadow-xs font-semibold' 
                : 'hover:text-slate-900'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" /> 3-Day Daily Sum
          </button>
        </div>
      </div>

      {/* Chart Container */}
      <div className="h-64 sm:h-72 w-full">
        {chartData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-slate-400">
            No forecast points available for selected horizon.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="displayTime" 
                tick={{ fontSize: 10, fill: '#64748b' }}
                interval={viewMode === 'hourly' ? 3 : 0}
                angle={-30}
                textAnchor="end"
                height={40}
              />
              {/* Left Axis: Precipitation in mm */}
              <YAxis 
                yAxisId="left"
                tick={{ fontSize: 10, fill: '#64748b' }}
                label={{ value: 'Rainfall (mm)', angle: -90, position: 'insideLeft', offset: 25, fontSize: 10, fill: '#64748b' }}
              />
              {/* Right Axis: Temperature in °C */}
              {viewMode === 'hourly' && (
                <YAxis 
                  yAxisId="right" 
                  orientation="right"
                  domain={['dataMin - 2', 'dataMax + 2']}
                  tick={{ fontSize: 10, fill: '#d97706' }}
                  label={{ value: 'Temp (°C)', angle: 90, position: 'insideRight', offset: 25, fontSize: 10, fill: '#d97706' }}
                />
              )}
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                verticalAlign="top" 
                height={36} 
                wrapperStyle={{ fontSize: '11px', paddingTop: '0px' }}
              />
              <Bar 
                yAxisId="left"
                dataKey="rainfall" 
                name="Precipitation (mm)" 
                fill="#2563eb" 
                radius={[3, 3, 0, 0]} 
                maxBarSize={22}
              />
              {viewMode === 'hourly' && (
                <Line 
                  yAxisId="right"
                  type="monotone" 
                  dataKey="temperature" 
                  name="Temperature (°C)" 
                  stroke="#d97706" 
                  strokeWidth={2}
                  dot={{ r: 2 }}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
