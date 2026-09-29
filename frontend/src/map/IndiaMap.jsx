import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { ZoomIn, ZoomOut, RotateCcw, Info, CloudRain, Thermometer, Wind } from 'lucide-react';
import { apiService } from '../services/api';

const INDIA_CENTER = [22.5, 80.0];
const DEFAULT_ZOOM = 4.8;

export default function IndiaMap({
  selectedLocation,
  onSelectDistrict,
  currentWeather = null,
  height = "520px"
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);
  const selectedMarkerRef = useRef(null);

  const [districtsList, setDistrictsList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: INDIA_CENTER,
        zoom: DEFAULT_ZOOM,
        minZoom: 4,
        maxZoom: 14,
        zoomControl: false // custom controls
      });

      // Standard OpenStreetMap tiles - Keyless, reliable, public
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
      }).addTo(map);

      const markersGroup = L.layerGroup().addTo(map);
      markersLayerRef.current = markersGroup;
      mapInstanceRef.current = map;
    }

    // Load GeoJSON / district points from backend
    async function loadDistricts() {
      try {
        setLoading(true);
        const geojson = await apiService.getLocationsGeoJSON();
        if (geojson && geojson.features) {
          setDistrictsList(geojson.features);
        }
      } catch (err) {
        console.error("Failed to load map points:", err);
      } finally {
        setLoading(false);
      }
    }

    loadDistricts();

    return () => {
      // clean up on unmount if needed
    };
  }, []);

  // Update district markers when districtsList changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersGroup = markersLayerRef.current;
    if (!map || !markersGroup || districtsList.length === 0) return;

    markersGroup.clearLayers();

    districtsList.forEach((feature) => {
      const { district, state, latitude, longitude } = feature.properties;
      const isSelected = selectedLocation && selectedLocation.district === district;

      const marker = L.circleMarker([latitude, longitude], {
        radius: isSelected ? 8 : 4.5,
        fillColor: isSelected ? '#1d4ed8' : '#334e68',
        color: isSelected ? '#ffffff' : '#f8fafc',
        weight: isSelected ? 2.5 : 1,
        opacity: 0.9,
        fillOpacity: isSelected ? 0.9 : 0.65
      });

      marker.bindTooltip(
        `<div class="text-xs font-semibold">${district}</div><div class="text-[10px] text-slate-500">${state}</div>`,
        { direction: 'top', offset: [0, -6] }
      );

      marker.on('click', () => {
        if (onSelectDistrict) {
          onSelectDistrict({
            district,
            state,
            latitude,
            longitude
          });
        }
      });

      markersGroup.addLayer(marker);

      if (isSelected) {
        selectedMarkerRef.current = marker;
      }
    });
  }, [districtsList, selectedLocation, onSelectDistrict]);

  // Pan to selected location
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !selectedLocation || !selectedLocation.latitude || !selectedLocation.longitude) return;

    map.flyTo([selectedLocation.latitude, selectedLocation.longitude], 8, {
      duration: 1.2,
      easeLinearity: 0.25
    });
  }, [selectedLocation?.latitude, selectedLocation?.longitude]);

  // Map Controls
  const handleZoomIn = () => {
    if (mapInstanceRef.current) mapInstanceRef.current.zoomIn();
  };

  const handleZoomOut = () => {
    if (mapInstanceRef.current) mapInstanceRef.current.zoomOut();
  };

  const handleReset = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView(INDIA_CENTER, DEFAULT_ZOOM);
    }
  };

  return (
    <div className="relative w-full rounded-xl overflow-hidden border border-slate-200 bg-slate-100 shadow-xs" style={{ height }}>
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Map Control Buttons */}
      <div className="absolute top-3 right-3 z-10 flex flex-col gap-1 bg-white p-1 rounded-lg border border-slate-200 shadow-md">
        <button
          onClick={handleZoomIn}
          aria-label="Zoom in"
          title="Zoom in"
          className="p-1.5 sm:p-2 text-slate-700 hover:bg-slate-100 active:bg-slate-200 rounded-md transition-colors"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={handleZoomOut}
          aria-label="Zoom out"
          title="Zoom out"
          className="p-1.5 sm:p-2 text-slate-700 hover:bg-slate-100 active:bg-slate-200 rounded-md transition-colors"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <div className="h-px bg-slate-200 my-0.5"></div>
        <button
          onClick={handleReset}
          aria-label="Reset view to India"
          title="Reset map view"
          className="p-1.5 sm:p-2 text-slate-700 hover:bg-slate-100 active:bg-slate-200 rounded-md transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Selected District Info Overlay Box */}
      {selectedLocation && (
        <div className="absolute bottom-3 left-3 right-3 sm:right-auto sm:max-w-xs z-10 bg-white/95 backdrop-blur-xs p-3 sm:p-4 rounded-xl border border-slate-200 shadow-lg">
          <div className="flex items-start justify-between gap-2 mb-1.5 sm:mb-2">
            <div>
              <div className="text-[10px] sm:text-xs uppercase font-semibold tracking-wider text-blue-700">
                Selected District
              </div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
                {selectedLocation.district || "Select a District"}
              </h3>
              <div className="text-[11px] sm:text-xs text-slate-500">
                {selectedLocation.state}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs py-1.5 sm:py-2 border-t border-b border-slate-100 my-1.5 sm:my-2">
            <div>
              <span className="text-slate-400 block text-[9px] sm:text-[10px] uppercase">Latitude</span>
              <span className="font-mono font-medium text-slate-700 text-[11px] sm:text-xs">
                {selectedLocation.latitude ? Number(selectedLocation.latitude).toFixed(4) : "—"}°N
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[9px] sm:text-[10px] uppercase">Longitude</span>
              <span className="font-mono font-medium text-slate-700 text-[11px] sm:text-xs">
                {selectedLocation.longitude ? Number(selectedLocation.longitude).toFixed(4) : "—"}°E
              </span>
            </div>
          </div>

          {currentWeather && (
            <div className="space-y-1 text-xs">
              <div className="flex items-center justify-between text-slate-700 text-[11px] sm:text-xs">
                <span className="flex items-center gap-1.5 text-slate-500">
                  <CloudRain className="w-3.5 h-3.5 text-blue-600" /> Live Rainfall:
                </span>
                <span className="font-mono font-semibold text-slate-900">
                  {currentWeather.rainfall !== null ? `${currentWeather.rainfall} mm` : "0.0 mm"}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-700 text-[11px] sm:text-xs">
                <span className="flex items-center gap-1.5 text-slate-500">
                  <Thermometer className="w-3.5 h-3.5 text-amber-600" /> Temperature:
                </span>
                <span className="font-mono font-semibold text-slate-900">
                  {currentWeather.temperature !== null ? `${currentWeather.temperature} °C` : "—"}
                </span>
              </div>
              <div className="text-[9px] sm:text-[10px] text-slate-400 pt-0.5 flex items-center justify-between">
                <span>Obs: {currentWeather.timestamp?.slice(0, 16).replace('T', ' ')}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Map Legend */}
      <div className="absolute top-3 left-3 z-10 bg-white/90 backdrop-blur-xs px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg border border-slate-200 text-[10px] sm:text-[11px] text-slate-600 flex items-center gap-2 sm:gap-3">
        <span className="flex items-center gap-1 sm:gap-1.5">
          <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-slate-700"></span> Verified
        </span>
        <span className="flex items-center gap-1 sm:gap-1.5">
          <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-blue-700 ring-2 ring-blue-200"></span> Active Point
        </span>
      </div>
    </div>
  );
}
