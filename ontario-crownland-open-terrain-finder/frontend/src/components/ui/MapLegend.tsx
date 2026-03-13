import React from 'react';

const LEGEND_ITEMS = [
  { label: 'Higher Candidate', color: '#a855f7' },
  { label: 'Manual Review', color: '#7c3aed' },
  { label: 'General Use', color: '#10b981' },
  { label: 'EMA', color: '#ec4899' },
  { label: 'Conser. Reserve', color: '#3b82f6' },
  { label: 'Provincial Park', color: '#78350f' },
  { label: 'Forest Reserve', color: '#f97316' },
  { label: 'Protected Area', color: '#ef4444' },
];

export default function MapLegend() {
  return (
    <div className="bg-slate-900/90 backdrop-blur-sm border border-slate-700 p-2.5 rounded-lg shadow-xl pointer-events-none">
      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 border-b border-slate-700 pb-1">
        Map Legend
      </h4>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
        {LEGEND_ITEMS.map((item) => (
          <div key={item.label} className="flex items-center gap-2">
            <span 
              className="w-2.5 h-2.5 rounded-sm shrink-0 border border-white/10" 
              style={{ backgroundColor: item.color }} 
            />
            <span className="text-[10px] text-slate-200 font-medium whitespace-nowrap">
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
