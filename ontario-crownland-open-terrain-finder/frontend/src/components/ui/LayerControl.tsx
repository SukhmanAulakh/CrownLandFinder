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
  const [isCollapsed, setIsCollapsed] = React.useState(false);

  return (
    <div className={`absolute left-4 top-4 transition-all duration-300 ease-[cubic-bezier(0.2,1,0.2,1)] bg-slate-900/95 backdrop-blur-xl shadow-2xl z-20 border border-slate-700/50 overflow-hidden ${
      isCollapsed ? 'w-12 h-12 rounded-xl grid place-items-center' : 'w-64 p-5 pb-6 rounded-2xl'
    }`}>
      {isCollapsed ? (
        <button
          onClick={() => setIsCollapsed(false)}
          className="w-full h-full flex items-center justify-center text-emerald-400 hover:text-white transition-colors animate-in zoom-in-50 duration-200"
          title="Expand Settings"
        >
          <svg className="w-6 h-6 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
          </svg>
        </button>
      ) : (
        <div className="animate-in fade-in duration-500">
          {/* ── Header ── */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex flex-col">
              <h2 className="text-white font-black text-[10px] uppercase tracking-[0.2em] opacity-90 select-none leading-none">
                Control Panel
              </h2>
              <span className="text-[8px] text-emerald-500/60 font-bold uppercase tracking-widest mt-1">Map Layers</span>
            </div>
            <button
              onClick={() => setIsCollapsed(true)}
              className="text-slate-500 hover:text-white transition-all hover:scale-110 active:scale-95 bg-slate-800/50 p-1.5 rounded-lg border border-slate-700/50"
              title="Collapse Settings"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-5">
            {/* ── Base Map Selection ── */}
            <section>
              <h3 className="font-bold text-slate-400 mb-2 text-[9px] uppercase tracking-wider">
                Base Terrain
              </h3>
              <div className="flex gap-1">
                <button
                  onClick={() => onSetBaseLayer('outdoors')}
                  className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${
                    baseLayer === 'outdoors' 
                      ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' 
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  Topo
                </button>
                <button
                  onClick={() => onSetBaseLayer('satellite')}
                  className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${
                    baseLayer === 'satellite' 
                      ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' 
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  Satellite
                </button>
              </div>
            </section>

            {/* ── Overlay Layers ── */}
            <section>
              <h3 className="font-bold text-slate-400 mb-2 text-[9px] uppercase tracking-wider">
                Visual Overlays
              </h3>
              <div className="flex flex-col gap-2">
                {LAYERS.map(layer => {
                  const isActive = activeLayers.includes(layer.id);
                  return (
                    <label
                      key={layer.id}
                      className="flex items-center justify-between cursor-pointer group py-0.5"
                    >
                      <span className={`text-[11px] transition-colors ${isActive ? 'text-slate-100 font-semibold' : 'text-slate-500 group-hover:text-slate-300'}`}>
                        {layer.name}
                      </span>
                      <button
                        onClick={() => onToggleLayer(layer.id)}
                        className={`relative inline-flex h-4 w-8 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          isActive 
                            ? (layer.id === 'candidates' ? 'bg-purple-500' : 'bg-emerald-500')
                            : 'bg-slate-700'
                        }`}
                      >
                        <span className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          isActive ? 'translate-x-4' : 'translate-x-0'
                        }`} />
                      </button>
                    </label>
                  );
                })}
              </div>
            </section>

            {/* ── Terrain Toggle ── */}
            <section className="pt-3 border-t border-slate-800">
              <label className="flex items-center justify-between cursor-pointer group">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">3D Realism</span>
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
            </section>

            {/* ── Opacity Accordion —- */}
            <section className="pt-3 border-t border-slate-800">
              <button 
                onClick={() => setIsOpacityExpanded(!isOpacityExpanded)}
                className="flex items-center justify-between w-full group overflow-hidden"
              >
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Fine Tuning</span>
                <svg 
                  className={`w-3 h-3 text-slate-500 transition-transform duration-200 ${isOpacityExpanded ? 'rotate-180' : ''}`} 
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isOpacityExpanded ? 'max-h-40 opacity-100 mt-4' : 'max-h-0 opacity-0'}`}>
                <div className="flex flex-col gap-5">
                  {/* Candidates Slider */}
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-[9px] text-slate-500 font-bold uppercase tracking-tighter">Candidates</span>
                      <span className="text-[9px] text-purple-400 font-black">{Math.round(candidateOpacity * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.05"
                      max="1.0"
                      step="0.05"
                      value={candidateOpacity}
                      onChange={(e) => onSetCandidateOpacity(parseFloat(e.target.value))}
                      className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500 hover:accent-purple-400 transition-all"
                    />
                  </div>

                  {/* Crown Land Slider */}
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-[9px] text-slate-500 font-bold uppercase tracking-tighter">Ownership</span>
                      <span className="text-[9px] text-emerald-400 font-black">{Math.round(clupaOpacity * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.05"
                      max="1.0"
                      step="0.05"
                      value={clupaOpacity}
                      onChange={(e) => onSetClupaOpacity(parseFloat(e.target.value))}
                      className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500 hover:accent-emerald-400 transition-all"
                    />
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
