import React from 'react';
import Sidebar from './Sidebar';
import TopHeader from './TopHeader';

export default function MainLayout({
  activePage,
  onNavigate,
  selectedLocation,
  isLiveConnected,
  children
}) {
  const [isMobileNavOpen, setIsMobileNavOpen] = React.useState(false);

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-800 overflow-x-hidden">
      {/* Sidebar with responsive mobile drawer support */}
      <Sidebar 
        activePage={activePage} 
        onNavigate={onNavigate} 
        isOpen={isMobileNavOpen}
        onClose={() => setIsMobileNavOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 w-full">
        <TopHeader 
          selectedLocation={selectedLocation} 
          isLiveConnected={isLiveConnected} 
          onToggleMobileNav={() => setIsMobileNavOpen(prev => !prev)}
        />
        <main className="flex-1 p-3.5 sm:p-6 max-w-7xl w-full mx-auto space-y-4 sm:space-y-6 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
