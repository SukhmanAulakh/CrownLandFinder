import React from 'react';

export default function WarningBanner() {
  return (
    <div className="bg-amber-50 border-l-4 border-amber-400 p-4 my-6 rounded-r-md shadow-sm">
      <div className="flex items-start">
        <svg className="h-5 w-5 text-amber-400 mr-3 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a1 1 0 00.86 1.5h18.64a1 1 0 00.86-1.5L12.71 3.86a1 1 0 00-1.42 0z" />
        </svg>
        <div>
          <h3 className="text-sm font-bold text-amber-800 uppercase tracking-wide">Preliminary Screening Only</h3>
          <p className="text-sm text-amber-700 mt-1">
            This tool provides preliminary terrain and land-status candidate screening. 
            <strong> You MUST conduct your own due diligence</strong> on official land use policy and local site conditions before visiting or selecting any area.
          </p>
        </div>
      </div>
    </div>
  );
}
