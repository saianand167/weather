import React, { useState, useEffect, useCallback } from 'react';
import MainLayout from './layouts/MainLayout';

// Overview Pages
import DashboardPage from './pages/DashboardPage';
import LiveForecastPage from './pages/LiveForecastPage';
import DistrictMapPage from './pages/DistrictMapPage';
import DataSourcesPage from './pages/DataSourcesPage';

// AI/ML Pages
import RegimePage from './pages/RegimePage';
import CorrectionPage from './pages/CorrectionPage';
import HeavyRainfallRiskPage from './pages/HeavyRainfallRiskPage';
import VerificationPage from './pages/VerificationPage';
import EventsPage from './pages/EventsPage';
import ErrorAnalysisPage from './pages/ErrorAnalysisPage';

// AI Assistant
import AssistantPage from './pages/AssistantPage';

import { apiService } from './services/api';

const DEFAULT_LOCATION = {
  state: "Delhi",
  district: "New Delhi",
  latitude: 28.6139,
  longitude: 77.2090
};

const VALID_PAGES = [
  'dashboard',
  'forecast',
  'map',
  'data-sources',
  'regime',
  'correction',
  'risk',
  'verification',
  'events',
  'error-analysis',
  'assistant'
];

const getPageFromHash = () => {
  if (typeof window !== 'undefined' && window.location.hash) {
    const raw = window.location.hash.replace(/^#\/?/, '').trim();
    if (VALID_PAGES.includes(raw)) {
      return raw;
    }
  }
  return 'dashboard';
};

export default function App() {
  const [activePage, setActivePage] = useState(getPageFromHash);
  const [selectedLocation, setSelectedLocation] = useState(DEFAULT_LOCATION);
  const [forecastData, setForecastData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Sync active page with browser Back / Forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const page = getPageFromHash();
      setActivePage(page);
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('hashchange', handlePopState);

    // If initial URL has no hash, set it cleanly without adding extra history step
    if (!window.location.hash) {
      window.history.replaceState({ page: 'dashboard' }, '', '#/dashboard');
    }

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('hashchange', handlePopState);
    };
  }, []);

  const handleNavigate = useCallback((pageId, replace = false) => {
    if (!VALID_PAGES.includes(pageId)) return;
    setActivePage(pageId);
    const targetHash = `#/${pageId}`;
    if (window.location.hash !== targetHash) {
      if (replace) {
        window.history.replaceState({ page: pageId }, '', targetHash);
      } else {
        window.history.pushState({ page: pageId }, '', targetHash);
      }
    }
  }, []);

  const fetchWeather = useCallback(async (location, isRefresh = false) => {
    if (!location.latitude || !location.longitude) return;
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    try {
      const data = await apiService.getForecast({
        lat: location.latitude,
        lon: location.longitude,
        district: location.district,
        state: location.state,
        days: 3
      });
      setForecastData(data);
    } catch (err) {
      console.error("Live weather fetch error:", err);
      setError(err.message || "Live data currently unavailable.");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchWeather(selectedLocation);
  }, [selectedLocation.district, selectedLocation.state, fetchWeather]);

  const handleLocationChange = (newLoc) => setSelectedLocation(newLoc);
  const handleRefresh = () => fetchWeather(selectedLocation, true);

  // Shared props for overview pages
  const sharedProps = {
    selectedLocation,
    onLocationChange: handleLocationChange,
    forecastData,
    loading,
    error,
    onRefresh: handleRefresh,
    isRefreshing,
    onNavigate: handleNavigate,
  };

  const renderActivePage = () => {
    switch (activePage) {
      // ── Overview ─────────────────────────────────────────
      case 'dashboard':
        return <DashboardPage {...sharedProps} />;
      case 'forecast':
        return <LiveForecastPage {...sharedProps} />;
      case 'map':
        return <DistrictMapPage {...sharedProps} />;
      case 'data-sources':
        return <DataSourcesPage />;

      // ── AI/ML Layer ───────────────────────────────────────
      case 'regime':
        return (
          <RegimePage
            selectedLocation={selectedLocation}
            onLocationChange={handleLocationChange}
            liveWeather={forecastData?.current}
          />
        );
      case 'correction':
        return (
          <CorrectionPage
            selectedLocation={selectedLocation}
            onLocationChange={handleLocationChange}
            liveWeather={forecastData?.current}
          />
        );
      case 'risk':
        return (
          <HeavyRainfallRiskPage
            selectedLocation={selectedLocation}
            onLocationChange={handleLocationChange}
            liveWeather={forecastData?.current}
          />
        );

      // ── Verification & Analysis ──────────────────────────
      case 'verification':
        return <VerificationPage />;
      case 'events':
        return <EventsPage />;
      case 'error-analysis':
        return <ErrorAnalysisPage />;

      // ── AI Assistant ─────────────────────────────────────
      case 'assistant':
        return (
          <AssistantPage
            selectedLocation={selectedLocation}
            liveWeather={forecastData?.current}
          />
        );

      default:
        return <DashboardPage {...sharedProps} />;
    }
  };

  return (
    <MainLayout
      activePage={activePage}
      onNavigate={handleNavigate}
      selectedLocation={selectedLocation}
      isLiveConnected={!error && forecastData?.current?.is_live}
    >
      {renderActivePage()}
    </MainLayout>
  );
}
