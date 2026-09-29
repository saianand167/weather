import React, { useEffect, useState } from 'react';
import { CloudRain, MapPin, Clock, CheckCircle2, AlertCircle, Menu } from 'lucide-react';

export default function TopHeader({
  selectedLocation,
  isLiveConnected = true,
  onToggleMobileNav
}) {
  const [currentDateTime, setCurrentDateTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentDateTime(
        now.toLocaleString('en-IN', {
          timeZone: 'Asia/Kolkata',
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true
        }) + ' IST'
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="h-14 sm:h-16 bg-white border-b border-slate-200 px-3.5 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
      {/* Branding & Hackathon Code */}
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
        {/* Mobile Hamburger Toggle Button */}
        <button
          onClick={onToggleMobileNav}
          aria-label="Open Navigation Menu"
          className="lg:hidden p-1.5 -ml-1 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors focus:outline-hidden"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-blue-700 text-white shadow-xs shrink-0">
          <CloudRain className="w-4 h-4 sm:w-5 sm:h-5" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight leading-none truncate">
              Rainfall Intelligence
            </h1>
            <span className="text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded font-mono shrink-0">
              SIH26080
            </span>
          </div>
          <p className="hidden sm:block text-[11px] text-slate-500 font-medium truncate">
            Regime-Aware AI/ML Rainfall Forecast Intelligence Platform
          </p>
        </div>
      </div>

      {/* Center / Right Metadata */}
      <div className="flex items-center gap-5">
        {/* Selected Location Pill */}
        {selectedLocation && selectedLocation.district && (
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-medium border border-slate-200">
            <MapPin className="w-3.5 h-3.5 text-blue-600" />
            <span>{selectedLocation.district}, {selectedLocation.state}</span>
          </div>
        )}

        {/* Real-time Clock */}
        <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-500 font-mono">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span>{currentDateTime}</span>
        </div>

        {/* Live Data Connection Indicator */}
        <div className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border bg-slate-50">
          <span className={`w-2 h-2 rounded-full ${isLiveConnected ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
          <span className={isLiveConnected ? 'text-emerald-700' : 'text-rose-700'}>
            {isLiveConnected ? 'Live Feed' : 'Offline'}
          </span>
        </div>
      </div>
    </header>
  );
}
