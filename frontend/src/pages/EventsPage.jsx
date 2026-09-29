import React, { useState, useEffect } from 'react';
import {
  History, RefreshCw, AlertCircle, ChevronRight, CloudRain,
  Calendar, MapPin, TrendingDown, Info, X, BarChart2
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { apiService } from '../services/api';

const REGIME_COLORS = {
  'Active Monsoon': 'bg-blue-100 text-blue-800 border-blue-300',
  'Break Monsoon': 'bg-orange-100 text-orange-800 border-orange-300',
  'Monsoon Lows / Depressions': 'bg-red-100 text-red-800 border-red-300',
  'Orographic Rainfall': 'bg-emerald-100 text-emerald-800 border-emerald-300',
  'Coastal Rainfall': 'bg-cyan-100 text-cyan-800 border-cyan-300',
  'Western Disturbances': 'bg-violet-100 text-violet-800 border-violet-300',
};

function EventCard({ event, onSelect }) {
  const regClass = REGIME_COLORS[event.regime] || 'bg-slate-100 text-slate-800 border-slate-300';
  return (
    <button
      onClick={() => onSelect(event.id)}
      className="w-full text-left bg-white border border-slate-200 rounded-xl p-4 hover:border-blue-300 hover:shadow-md transition-all group"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-700 transition-colors">{event.title}</h3>
        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 shrink-0 mt-0.5 transition-colors" />
      </div>
      <div className="flex flex-wrap gap-2 mb-3">
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${regClass}`}>
          {event.regime}
        </span>
        <span className="text-[10px] text-slate-500 flex items-center gap-1">
          <MapPin className="w-3 h-3" /> {event.district}, {event.state}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2 text-[10px] text-slate-600">
        <div>
          <div className="text-slate-400">Peak Rainfall</div>
          <div className="font-bold font-mono text-blue-700">{event.peak_rainfall_mm} mm</div>
        </div>
        <div>
          <div className="text-slate-400">Start</div>
          <div className="font-medium">{new Date(event.start_date).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}</div>
        </div>
        <div>
          <div className="text-slate-400">End</div>
          <div className="font-medium">{new Date(event.end_date).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}</div>
        </div>
      </div>
      <div className="mt-2 text-[10px] text-slate-400 italic truncate">Source: {event.source_reference}</div>
    </button>
  );
}

function TimelineChart({ steps }) {
  const chartData = steps.map((s, i) => ({
    step: `T+${i}h`,
    Observed: s.observed_rainfall,
    'Raw NWP': s.raw_nwp_rainfall,
    Corrected: s.corrected_rainfall,
  }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 20, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="step" tick={{ fontSize: 10 }} />
        <YAxis tick={{ fontSize: 10 }} label={{ value: 'Rainfall (mm)', angle: -90, position: 'insideLeft', style: { fontSize: 10 } }} />
        <Tooltip />
        <Legend verticalAlign="top" height={30} />
        <Line type="monotone" dataKey="Observed" stroke="#1e3a8a" strokeWidth={2.5} dot={false} />
        <Line type="monotone" dataKey="Raw NWP" stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="4 3" dot={false} />
        <Line type="monotone" dataKey="Corrected" stroke="#6366f1" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export default function EventsPage() {
  const [events, setEvents] = useState([]);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await apiService.listHistoricalEvents();
        setEvents(data);
      } catch (err) {
        setError(err.message || 'Failed to load historical events.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleSelect = async (id) => {
    setLoadingDetail(true);
    setDetail(null);
    try {
      const d = await apiService.getHistoricalEventDetail(id);
      setDetail(d);
    } catch (err) {
      setError(err.message || 'Failed to load event detail.');
    } finally {
      setLoadingDetail(false);
    }
  };

  const regClass = detail ? (REGIME_COLORS[detail.regime] || 'bg-slate-100 text-slate-800 border-slate-300') : '';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-600 via-orange-500 to-rose-600 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold">Historical Event Replay</h1>
            <p className="text-orange-200 text-xs">Observed vs Raw NWP vs ML Corrected · Regime Timeline</p>
          </div>
        </div>
        <p className="text-sm text-orange-100 leading-relaxed">
          Replay canonical Indian meteorological benchmark events. View how the regime classifier and bias corrector perform on verified historical observations, with full timeline reconstruction.
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div><div className="font-semibold">Error</div><div className="text-xs mt-0.5">{error}</div></div>
        </div>
      )}

      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 animate-pulse h-36 space-y-2">
              <div className="h-4 bg-slate-200 rounded w-3/4"/>
              <div className="h-3 bg-slate-100 rounded w-1/2"/>
            </div>
          ))}
        </div>
      )}

      {/* Event Grid */}
      {!loading && events.length === 0 && !error && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center text-amber-700 text-sm">
          <Info className="w-8 h-8 mx-auto mb-2 text-amber-400" />
          <div className="font-semibold mb-1">No Historical Events Loaded</div>
          <p className="text-xs text-amber-600">Historical event catalogue will populate once the database initialization seeds benchmark events. Check that <code className="bg-amber-100 px-1 rounded">init_db()</code> has run successfully.</p>
        </div>
      )}

      {!loading && events.length > 0 && !detail && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {events.map(ev => (
            <EventCard key={ev.id} event={ev} onSelect={handleSelect} />
          ))}
        </div>
      )}

      {/* Detail View */}
      {loadingDetail && (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 animate-pulse space-y-4">
          <div className="h-6 bg-slate-200 rounded w-1/2"/>
          <div className="h-3 bg-slate-100 rounded w-full"/>
          <div className="h-64 bg-slate-100 rounded"/>
        </div>
      )}

      {detail && !loadingDetail && (
        <div className="space-y-5">
          {/* Back + Title */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setDetail(null)}
              className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-blue-700 font-medium px-3 py-1.5 rounded-lg border border-slate-200 hover:border-blue-300 bg-white transition-all"
            >
              <X className="w-3.5 h-3.5" /> Back to events
            </button>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${regClass}`}>{detail.regime}</span>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="bg-slate-50 px-6 py-5 border-b border-slate-200">
              <h2 className="text-base font-bold text-slate-900">{detail.title}</h2>
              <p className="text-xs text-slate-500 mt-1">{detail.description}</p>
              <div className="flex flex-wrap gap-4 mt-3 text-xs text-slate-600">
                <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" />{detail.district}, {detail.state}</span>
                <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />{detail.start_date?.split('T')[0]} → {detail.end_date?.split('T')[0]}</span>
                <span className="flex items-center gap-1.5"><CloudRain className="w-3.5 h-3.5" />Peak: <strong className="text-blue-700">{detail.peak_rainfall_mm} mm</strong></span>
              </div>
            </div>
            <div className="p-6 space-y-5">
              {/* Timeline Chart */}
              {detail.timeline && detail.timeline.length > 0 ? (
                <div>
                  <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <BarChart2 className="w-3.5 h-3.5" /> Rainfall Timeline: Observed vs NWP vs ML Corrected
                  </h4>
                  <TimelineChart steps={detail.timeline} />
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400 text-xs">
                  <Info className="w-6 h-6 mx-auto mb-2" />
                  No matched observation-NWP pairs found for this event's time window in the database.
                </div>
              )}

              {/* Event Metrics */}
              {detail.event_metrics && Object.keys(detail.event_metrics).length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">Event Verification Metrics</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: 'Raw RMSE', val: detail.event_metrics.raw_nwp?.rmse },
                      { label: 'Corr. RMSE', val: detail.event_metrics.corrected?.rmse },
                      { label: 'Raw CSI', val: detail.event_metrics.raw_nwp?.csi },
                      { label: 'Corr. CSI', val: detail.event_metrics.corrected?.csi },
                    ].map(({ label, val }) => (
                      <div key={label} className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-center">
                        <div className="text-[10px] text-slate-500">{label}</div>
                        <div className="text-xl font-bold font-mono text-slate-800 mt-0.5">{val?.toFixed(3) ?? '—'}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Timeline Table */}
              {detail.timeline && detail.timeline.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">Step-by-Step Timeline</h4>
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider">
                        <tr>
                          <th className="py-2.5 px-3 text-left">Timestamp</th>
                          <th className="py-2.5 px-3 text-center">Observed</th>
                          <th className="py-2.5 px-3 text-center">Raw NWP</th>
                          <th className="py-2.5 px-3 text-center">Corrected</th>
                          <th className="py-2.5 px-3 text-center">Regime</th>
                          <th className="py-2.5 px-3 text-center">Heavy Rain P</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {detail.timeline.map((step, i) => (
                          <tr key={i} className="hover:bg-slate-50 transition-colors">
                            <td className="py-2 px-3 font-mono text-slate-600">{step.timestamp?.replace('T', ' ').split('.')[0]}</td>
                            <td className="py-2 px-3 text-center font-mono font-bold text-slate-900">{step.observed_rainfall.toFixed(2)}</td>
                            <td className="py-2 px-3 text-center font-mono text-slate-500">{step.raw_nwp_rainfall.toFixed(2)}</td>
                            <td className="py-2 px-3 text-center font-mono text-indigo-700 font-semibold">{step.corrected_rainfall.toFixed(2)}</td>
                            <td className="py-2 px-3 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] border ${REGIME_COLORS[step.identified_regime] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                                {step.identified_regime.split(' ')[0]}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-center font-mono text-slate-600">{(step.heavy_rain_prob * 100).toFixed(0)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
