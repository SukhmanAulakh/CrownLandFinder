"use client";

import React from "react";

interface MeasurementPanelProps {
  points: { lng: number; lat: number }[];
  distances: number[]; // individual segments in meters
  onClose: () => void;
  onClear: () => void;
}

export default function MeasurementPanel({ points, distances, onClose, onClear }: MeasurementPanelProps) {
  const totalMeters = distances.reduce((sum, d) => sum + d, 0);
  const totalDisplay = totalMeters >= 1000 
    ? `${(totalMeters / 1000).toFixed(2)} km` 
    : `${Math.round(totalMeters)} m`;

  return (
    <div className="absolute right-12 top-24 w-72 bg-slate-950/90 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-700 overflow-hidden z-[50] flex flex-col max-h-[70vh]">
      {/* Header */}
      <div className="p-3.5 border-b border-slate-700 bg-slate-900/50 flex justify-between items-center shrink-0 rounded-t-2xl">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
          <span className="text-[11px] font-black uppercase tracking-widest text-white">Click map to add points</span>
        </div>
        <button onClick={onClose} className="text-slate-500 hover:text-white transition">
           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Main Stats */}
      <div className="p-5 flex flex-col items-center shrink-0">
        <div className="text-4xl font-black text-emerald-400 tracking-tighter tabular-nums drop-shadow-[0_0_15px_rgba(16,185,129,0.3)]">
          {totalDisplay}
        </div>
      </div>

      {/* Segment List */}
      <div className="flex-grow overflow-y-auto px-1">
        <div className="space-y-0.5 pb-2">
          {distances.map((dist, idx) => (
            <div key={idx} className="flex justify-between items-center py-2 px-4 hover:bg-slate-900/50 transition">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Segment {idx + 1}</span>
              <span className="text-xs font-mono font-bold text-slate-300 tabular-nums">
                {dist >= 1000 ? `${(dist / 1000).toFixed(2)} km` : `${Math.round(dist)} m`}
              </span>
            </div>
          ))}
          {points.length > 0 && points.length < 2 && (
             <div className="py-8 px-4 text-center">
              <p className="text-[10px] text-slate-500 italic uppercase">Add another point to see distance</p>
             </div>
          )}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="p-3 bg-slate-900/80 border-t border-slate-700 flex gap-2 shrink-0">
        <button 
          onClick={onClose}
          className="flex-grow py-2 bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 font-black uppercase text-[10px] tracking-widest rounded-lg hover:bg-emerald-600/30 transition shadow-lg shadow-emerald-900/10"
        >
          Done
        </button>
        <button 
          onClick={onClear}
          title="Clear all points"
          className="p-2 border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 transition rounded-lg flex items-center justify-center aspect-square shrink-0"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>
    </div>
  );
}
