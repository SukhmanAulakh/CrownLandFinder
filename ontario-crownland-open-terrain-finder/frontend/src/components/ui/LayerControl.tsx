import React from 'react';

export const LAYERS = [
  { id: 'candidates', name: 'Open Terrain Candidates', defaultOn: true },
  { id: 'clupa_polygons', name: 'Crown Land Use (CLUPA)', defaultOn: true },
];

interface LayerControlProps {
  activeLayers: string[];
  onToggleLayer: (layerId: string) => void;
  baseLayer: 'outdoors' | 'satellite';
  onSetBaseLayer: (layer: 'outdoors' | 'satellite') => void;
  showTerrain: boolean;
  onToggleTerrain: () => void;
  candidateOpacity: number;
  onSetCandidateOpacity: (opacity: number) => void;
  clupaOpacity: number;
  onSetClupaOpacity: (opacity: number) => void;
}

export default function LayerControl({ 
  activeLayers, 
  onToggleLayer,
  baseLayer,
  onSetBaseLayer,
  showTerrain,
  onToggleTerrain,
  candidateOpacity,
  onSetCandidateOpacity,
  clupaOpacity,
  onSetClupaOpacity
}: LayerControlProps) {
  const [isOpacityExpanded, setIsOpacityExpanded] = React.useState(false);

  return (
    <div className="absolute left-4 top-4 w-52 bg-slate-900/90 backdrop-blur-sm rounded-lg shadow-xl z-10 p-3 border border-slate-700">
      {/* ── Base Map Selection ── */}
      <h3 className="font-semibold text-slate-200 mb-2 text-[10px] uppercase tracking-widest">
        Base Map
      </h3>
      <div className="flex gap-1 mb-4">
        <button
          onClick={() => onSetBaseLayer('outdoors')}
          className={`flex-1 py-1.5 rounded text-[10px] font-bold uppercase transition ${
            baseLayer === 'outdoors' 
              ? 'bg-emerald-600 text-white' 
              : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
          }`}
        >
          Topo
        </button>
        <button
          onClick={() => onSetBaseLayer('satellite')}
          className={`flex-1 py-1.5 rounded text-[10px] font-bold uppercase transition ${
            baseLayer === 'satellite' 
              ? 'bg-emerald-600 text-white' 
              : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
          }`}
        >
          Satellite
        </button>
      </div>

      {/* ── Overlay Layers ── */}
      <h3 className="font-semibold text-slate-200 mb-2 text-[10px] uppercase tracking-widest">
        Overlays
      </h3>
      <div className="flex flex-col gap-1.5 border-b border-slate-700 pb-3 mb-3">
        {LAYERS.map(layer => {
          const isActive = activeLayers.includes(layer.id);
          return (
            <label
              key={layer.id}
              className="flex items-center gap-2 cursor-pointer select-none group py-0.5"
            >
              <span
                className={`relative flex-shrink-0 w-4 h-4 rounded border-2 transition-colors duration-150 ${
                  isActive
                    ? (layer.id === 'candidates' ? 'bg-purple-500 border-purple-500' : 'bg-emerald-500 border-emerald-500')
                    : 'bg-transparent border-slate-500 group-hover:border-slate-400'
                }`}
                onClick={() => onToggleLayer(layer.id)}
              >
                {isActive && (
                  <svg viewBox="0 0 10 10" className="absolute inset-0 m-auto w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1.5 5l2.5 2.5 4.5-4.5" />
                  </svg>
                )}
              </span>
              <span className={`text-[11px] leading-tight ${isActive ? 'text-slate-100 font-medium' : 'text-slate-400 group-hover:text-slate-200'}`}>
                {layer.name}
              </span>
            </label>
          );
        })}
      </div>

      {/* ── Terrain Toggle ── */}
      <label className="flex items-center justify-between cursor-pointer group mt-1">
        <span className="text-[10px] text-slate-300 font-semibold uppercase tracking-wider">3D Terrain</span>
        <button 
          onClick={onToggleTerrain}
          className={`relative inline-flex h-4 w-8 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
            showTerrain ? 'bg-emerald-600' : 'bg-slate-700'
          }`}
        >
          <span className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            showTerrain ? 'translate-x-4' : 'translate-x-0'
          }`} />
        </button>
      </label>

      {/* ── Opacity Accordion —- */}
      <div className="mt-4 pt-4 border-t border-slate-700">
        <button 
          onClick={() => setIsOpacityExpanded(!isOpacityExpanded)}
          className="flex items-center justify-between w-full group overflow-hidden"
        >
          <span className="text-[10px] text-slate-300 font-semibold uppercase tracking-wider">Opacity Settings</span>
          <svg 
            className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${isOpacityExpanded ? 'rotate-180' : ''}`} 
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        
        <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isOpacityExpanded ? 'max-h-40 opacity-100 mt-3' : 'max-h-0 opacity-0'}`}>
          <div className="px-1 flex flex-col gap-4">
            {/* Candidates Slider */}
            <div>
              <div className="flex justify-between mb-1.5">
                <span className="text-[9px] text-slate-400 font-medium">Candidates</span>
                <span className="text-[9px] text-purple-400 font-bold">{Math.round(candidateOpacity * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.05"
                max="1.0"
                step="0.05"
                value={candidateOpacity}
                onChange={(e) => onSetCandidateOpacity(parseFloat(e.target.value))}
                className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500 hover:accent-purple-400 transition-all"
              />
            </div>

            {/* Crown Land Slider */}
            <div>
              <div className="flex justify-between mb-1.5">
                <span className="text-[9px] text-slate-400 font-medium">Crown Land</span>
                <span className="text-[9px] text-emerald-400 font-bold">{Math.round(clupaOpacity * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.05"
                max="1.0"
                step="0.05"
                value={clupaOpacity}
                onChange={(e) => onSetClupaOpacity(parseFloat(e.target.value))}
                className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500 hover:accent-emerald-400 transition-all"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
