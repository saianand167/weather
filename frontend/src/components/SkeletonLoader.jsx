import React from 'react';

export default function SkeletonLoader({ type = "card", count = 1 }) {
  if (type === "card") {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="bg-white p-5 border border-slate-200 rounded-xl space-y-3">
            <div className="h-4 bg-slate-200 rounded w-1/2"></div>
            <div className="h-8 bg-slate-200 rounded w-3/4"></div>
            <div className="h-3 bg-slate-100 rounded w-1/3"></div>
          </div>
        ))}
      </div>
    );
  }

  if (type === "chart") {
    return (
      <div className="bg-white p-6 border border-slate-200 rounded-xl animate-pulse space-y-4">
        <div className="flex justify-between items-center">
          <div className="h-5 bg-slate-200 rounded w-1/4"></div>
          <div className="h-4 bg-slate-100 rounded w-24"></div>
        </div>
        <div className="h-64 bg-slate-100 rounded-lg"></div>
      </div>
    );
  }

  if (type === "table") {
    return (
      <div className="bg-white p-6 border border-slate-200 rounded-xl animate-pulse space-y-3">
        <div className="h-5 bg-slate-200 rounded w-1/3 mb-4"></div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-10 bg-slate-100 rounded"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="bg-white p-6 border border-slate-200 rounded-xl animate-pulse h-40"></div>
  );
}
