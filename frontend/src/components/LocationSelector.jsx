import React, { useEffect, useState } from 'react';
import { MapPin, Compass, Navigation } from 'lucide-react';
import { apiService } from '../services/api';

export default function LocationSelector({
  selectedLocation,
  onLocationChange,
  disabled = false
}) {
  const [states, setStates] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [loadingStates, setLoadingStates] = useState(true);
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [error, setError] = useState(null);

  // Load States on mount
  useEffect(() => {
    let isMounted = true;
    async function loadStates() {
      try {
        setLoadingStates(true);
        const data = await apiService.getStates();
        if (isMounted) {
          setStates(data.states || []);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError("Failed to load state registry.");
        }
      } finally {
        if (isMounted) setLoadingStates(false);
      }
    }
    loadStates();
    return () => { isMounted = false; };
  }, []);

  // Load Districts when state changes
  useEffect(() => {
    let isMounted = true;
    async function loadDistricts() {
      if (!selectedLocation.state) return;
      try {
        setLoadingDistricts(true);
        const list = await apiService.getDistricts(selectedLocation.state);
        if (isMounted) {
          setDistricts(list || []);
        }
      } catch (err) {
        if (isMounted) setDistricts([]);
      } finally {
        if (isMounted) setLoadingDistricts(false);
      }
    }
    loadDistricts();
    return () => { isMounted = false; };
  }, [selectedLocation.state]);

  const handleStateChange = (e) => {
    const newState = e.target.value;
    // Find first district of the state once loaded, or set state first
    onLocationChange({
      ...selectedLocation,
      state: newState,
      district: '', // reset district until selected
    });
  };

  const handleDistrictChange = (e) => {
    const districtName = e.target.value;
    const found = districts.find(d => d.name === districtName);
    if (found) {
      onLocationChange({
        state: selectedLocation.state,
        district: found.name,
        latitude: found.latitude,
        longitude: found.longitude
      });
    }
  };

  return (
    <div className="bg-white p-3.5 sm:p-4 border border-slate-200 rounded-xl shadow-xs">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
        {/* State & District Selectors */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 shrink-0">
            <MapPin className="w-4 h-4 text-blue-700" />
            <span className="text-xs font-semibold uppercase text-slate-500 tracking-wider">
              Location:
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            {/* State Dropdown */}
            <div className="relative w-full sm:w-auto">
              <select
                aria-label="Select State or Union Territory"
                value={selectedLocation.state || ""}
                onChange={handleStateChange}
                disabled={disabled || loadingStates}
                className="w-full sm:w-auto min-h-[38px] px-3 py-2 sm:py-1.5 text-xs font-medium text-slate-800 bg-slate-50 border border-slate-200 rounded-lg hover:border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all disabled:opacity-50"
              >
                {loadingStates ? (
                  <option value="">Loading States...</option>
                ) : (
                  states.map(st => (
                    <option key={st} value={st}>{st}</option>
                  ))
                )}
              </select>
            </div>

            {/* District Dropdown */}
            <div className="relative w-full sm:w-auto">
              <select
                aria-label="Select District"
                value={selectedLocation.district || ""}
                onChange={handleDistrictChange}
                disabled={disabled || loadingDistricts || districts.length === 0}
                className="w-full sm:w-auto min-h-[38px] px-3 py-2 sm:py-1.5 text-xs font-medium text-slate-800 bg-slate-50 border border-slate-200 rounded-lg hover:border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all disabled:opacity-50"
              >
                {loadingDistricts ? (
                  <option value="">Loading Districts...</option>
                ) : districts.length === 0 ? (
                  <option value="">Select District</option>
                ) : (
                  districts.map(d => (
                    <option key={d.id} value={d.name}>{d.name}</option>
                  ))
                )}
              </select>
            </div>
          </div>
        </div>

        {/* Resolved Geographic Coordinate Reference */}
        <div className="flex items-center justify-between sm:justify-start gap-2 text-xs text-slate-500 bg-slate-50 px-3 py-2 sm:py-1.5 rounded-lg border border-slate-100">
          <div className="flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="font-mono text-slate-700 text-[11px] sm:text-xs">
              {selectedLocation.latitude !== undefined ? Number(selectedLocation.latitude).toFixed(4) : "—"}°N,{" "}
              {selectedLocation.longitude !== undefined ? Number(selectedLocation.longitude).toFixed(4) : "—"}°E
            </span>
          </div>
          <span className="text-[10px] sm:text-[11px] text-slate-400 italic">
            (Grid Point)
          </span>
        </div>
      </div>
    </div>
  );
}
