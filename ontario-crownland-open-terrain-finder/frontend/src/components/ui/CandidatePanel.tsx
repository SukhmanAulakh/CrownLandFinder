import React, { useMemo } from "react";

interface CandidatePanelProps {
  feature: any | null;
  ballisticResult: any | null;
  onBallisticResult: (res: any) => void;
  onSetManualMode: (mode: 'firing' | 'target' | null) => void;
  onAnalyze: () => void;
  manualPoints: { firing?: {lng:number, lat:number}, target?: {lng:number, lat:number} };
  selectionMode: 'firing' | 'target' | null;
  onClose: () => void;
}

/** Compute centroid of the first polygon ring as [lng, lat] */
function computeCentroid(geometry: any): [number, number] | null {
  if (!geometry?.coordinates) return null;
  try {
    const typ = geometry.type;
    if (typ === "Point") return geometry.coordinates as [number, number];
    
    let ring: number[][];
    if (typ === "Polygon") ring = geometry.coordinates[0];
    else if (typ === "MultiPolygon") ring = geometry.coordinates[0][0];
    else return null;

    let sumLng = 0, sumLat = 0;
    for (const pt of ring) { sumLng += pt[0]; sumLat += pt[1]; }
    return [sumLng / ring.length, sumLat / ring.length];
  } catch {
    return null;
  }
}

/** Return a copy-to-clipboard link for Google Maps */
function googleMapsUrl(lat: number, lng: number) {
  return `https://www.google.com/maps?q=${lat.toFixed(6)},${lng.toFixed(6)}`;
}

export default function CandidatePanel({ 
  feature, 
  ballisticResult, 
  onBallisticResult, 
  onSetManualMode,
  onAnalyze,
  manualPoints,
  selectionMode,
  onClose 
}: CandidatePanelProps) {
  const [isSearching, setIsSearching] = React.useState(false);
  const [searchError, setSearchError] = React.useState<string | null>(null);

  if (!feature) return null;

  const props = feature.properties || {};
  const centroid = useMemo(() => computeCentroid(feature.geometry), [feature]);
  const [lng, lat] = centroid ?? [null, null];

  const handleDeepSearch = async () => {
    if (!props.id) return;
    setIsSearching(true);
    setSearchError(null);
    try {
      const resp = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/candidate/${props.id}/ballistic-search`);
      if (resp.ok) {
        const data = await resp.json();
        onBallisticResult(data);
      } else {
        const errData = await resp.json().catch(() => ({ detail: "Search failed" }));
        setSearchError(errData.detail || "Terrain analysis failed for this area.");
      }
    } catch (err) {
      console.error("Deep search failed", err);
      setSearchError("Network error. Please ensure backend is reachable.");
    } finally {
      setIsSearching(false);
    }
  };

  const isCandidate = !!props._is_candidate;
  const isClupa = !!props._is_clupa;
  const isProtected = !!props._is_protected;

  const classColors =
    props.classification === "Higher open-terrain candidate"
      ? "bg-purple-100 text-purple-800"
      : props.classification === "Candidate for manual review"
      ? "bg-yellow-100 text-yellow-800"
      : "bg-red-100 text-red-800";

  return (
    <div className="absolute right-0 top-0 bottom-0 w-80 bg-slate-950 shadow-2xl z-10 flex flex-col border-l border-slate-700">
      {/* Header */}
      <div className="bg-slate-900 text-white p-4 flex justify-between items-center border-b border-slate-700">
        <div>
          <p className="text-[10px] text-slate-400 uppercase tracking-widest">
            {isCandidate ? "Candidate Detail" : isProtected ? "Protected Area" : "Land Use Detail"}
          </p>
          <h2 className="font-bold text-base text-white">
            {isCandidate ? `Unit #${props.id}` : props.area_name || props.name || "Selected Area"}
          </h2>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-white transition p-1 rounded hover:bg-slate-700">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="p-4 flex-grow overflow-y-auto space-y-6">
        {/* Land Use Section (CLUPA/Protected) */}
        {(isClupa || isProtected) && (
          <div className="space-y-3">
            <p className="text-[10px] text-slate-400 uppercase tracking-wider border-b border-slate-800 pb-1">Identification</p>
            <div className="grid grid-cols-1 gap-3">
              <div className="p-2.5 bg-slate-900/50 rounded border border-slate-800">
                <p className="text-[10px] text-slate-500 uppercase font-semibold">Policy ID</p>
                <p className="text-sm font-mono text-emerald-400">{props.policy_ident || props.external_id || "N/A"}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase font-semibold">Designation</p>
                <p className="text-sm text-slate-200">{props.designation_eng || props.protected_type || "N/A"}</p>
              </div>
              {props.category_eng && (
                <div>
                  <p className="text-[10px] text-slate-500 uppercase font-semibold">Category</p>
                  <p className="text-xs text-slate-400">{props.category_eng}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Terrain Candidate Section */}
        {isCandidate && (
          <div className="space-y-4">
            <p className="text-[10px] text-slate-400 uppercase tracking-wider border-b border-slate-800 pb-1">Terrain Analysis</p>
            <div>
              <p className="text-[10px] text-slate-400 uppercase mb-1.5 font-medium">Classification</p>
              <span className={`px-3 py-1 rounded-full font-semibold text-[10px] ${classColors}`}>
                {props.classification || "Unknown"}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-slate-800 rounded-lg border border-slate-700">
                <p className="text-[10px] text-slate-400 uppercase font-semibold mb-1">Open Land</p>
                <p className="text-2xl font-bold text-purple-300">{Math.round(props.open_land_score || 0)}</p>
                <p className="text-[10px] text-slate-500">/ 100</p>
              </div>
              <div className="p-3 bg-slate-800 rounded-lg border border-slate-700">
                <p className="text-[10px] text-slate-400 uppercase font-semibold mb-1">Enclosure</p>
                <p className="text-2xl font-bold text-violet-300">{Math.round(props.terrain_enclosure_score || 0)}</p>
                <p className="text-[10px] text-slate-500">/ 100</p>
              </div>
              <div className="p-3 bg-slate-800 rounded-lg border border-slate-700 col-span-2 text-center pointer-events-none">
                <p className="text-[10px] text-slate-400 uppercase font-semibold mb-1">Usable Area</p>
                <p className="text-xl font-bold text-slate-200">{props.area_m2 ? (props.area_m2 / 1_000_000).toFixed(2) : "—"} km²</p>
              </div>
            </div>

            {/* Deep Search Section */}
            <div className="space-y-3 pt-2">
                <button
                onClick={handleDeepSearch}
                disabled={isSearching}
                className={`w-full py-2.5 rounded-lg border flex items-center justify-center gap-2 font-bold uppercase tracking-wider text-[11px] transition-all duration-200 ${
                  isSearching
                    ? "bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed"
                    : "bg-purple-600/20 border-purple-500/40 text-purple-400 hover:bg-purple-600/30 hover:border-purple-400"
                }`}
              >
                {isSearching ? (
                  <>
                    <div className="w-3 h-3 border-2 border-t-transparent border-purple-400 rounded-full animate-spin" />
                    Analyzing Topography...
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    Deep Search: Target Practice
                  </>
                )}
                </button>

                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => onSetManualMode(selectionMode === 'firing' ? null : 'firing')}
                    className={`w-full py-2.5 rounded-lg border font-bold uppercase tracking-wider text-[11px] flex items-center justify-center gap-2 transition-all duration-200 ${
                      selectionMode === 'firing' 
                        ? "bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-900/40" 
                        : manualPoints.firing 
                          ? "bg-slate-800 border-emerald-500/50 text-emerald-400" 
                          : "bg-slate-800 border-slate-700 text-slate-400 hover:border-emerald-500/50 hover:text-emerald-400"
                    }`}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {manualPoints.firing ? "Change Shooting Pos" : "Select Shooting Pos"}
                  </button>

                  <button
                    onClick={() => onSetManualMode(selectionMode === 'target' ? null : 'target')}
                    className={`w-full py-2.5 rounded-lg border font-bold uppercase tracking-wider text-[11px] flex items-center justify-center gap-2 transition-all duration-200 ${
                      selectionMode === 'target' 
                        ? "bg-red-600 border-red-500 text-white shadow-lg shadow-red-900/40" 
                        : manualPoints.target 
                          ? "bg-slate-800 border-red-500/50 text-red-400" 
                          : "bg-slate-800 border-slate-700 text-slate-400 hover:border-red-500/50 hover:text-red-400"
                    }`}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {manualPoints.target ? "Change Target Pos" : "Select Target Pos"}
                  </button>

                  {manualPoints.firing && manualPoints.target && (
                    <button
                      onClick={onAnalyze}
                      disabled={isSearching}
                      className="w-full py-2.5 mt-1 rounded-lg border border-purple-500/40 bg-purple-600/20 text-purple-400 hover:bg-purple-600/30 font-bold uppercase tracking-wider text-[11px] flex items-center justify-center gap-2 transition-all duration-200"
                    >
                      {isSearching ? (
                        <div className="w-3 h-3 border-2 border-t-transparent border-purple-400 rounded-full animate-spin" />
                      ) : (
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 012 2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      )}
                      Analyze Manual Range
                    </button>
                  )}
                </div>

                {searchError && (
                  <div className="p-2.5 bg-red-900/30 border border-red-500/40 rounded-lg animate-in fade-in slide-in-from-top-1 duration-300">
                    <p className="text-[10px] text-red-400 font-bold flex items-center gap-1.5 uppercase tracking-tighter">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {searchError}
                    </p>
                  </div>
                )}

                {ballisticResult && (
                <div className="p-3 bg-slate-900 border border-purple-500/30 rounded-lg animate-in fade-in slide-in-from-top-2 duration-500">
                  <p className="text-[10px] text-purple-400 uppercase font-bold mb-2 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-pulse" />
                    Ballistic Profile
                  </p>
                  <div className="space-y-2.5">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-[10px] text-slate-500 uppercase font-semibold">Firing Range</p>
                        <p className="text-xl font-bold text-white leading-none">{ballisticResult.distance_m}m</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-slate-500 uppercase font-semibold">
                          {ballisticResult.score !== undefined ? "Feasibility" : "Backdrop"}
                        </p>
                        <p className={`text-[10px] font-bold uppercase ${
                          ballisticResult.status === "Infeasible" ? "text-red-400" :
                          ballisticResult.status === "Marginal" ? "text-yellow-400" :
                          "text-emerald-400"
                        }`}>
                          {ballisticResult.score !== undefined ? `${ballisticResult.score}% ${ballisticResult.status}` : ballisticResult.backdrop_type}
                        </p>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-slate-800 space-y-3">
                      <p className="text-[10px] text-slate-400 italic">
                        {ballisticResult.recommendation}
                      </p>

                      {/* Sub-scores Breakdown */}
                      {ballisticResult.sub_scores && (
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <div className="p-2 bg-slate-900/50 rounded border border-slate-800/50">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-[8px] uppercase tracking-wider text-slate-500">Safe Tenure</span>
                              <span className={`text-[10px] font-bold ${ballisticResult.sub_scores.tenure >= 70 ? 'text-emerald-400' : 'text-orange-400'}`}>{ballisticResult.sub_scores.tenure}%</span>
                            </div>
                            <div className="h-0.5 bg-slate-800 rounded-full overflow-hidden">
                              <div className={`h-full ${ballisticResult.sub_scores.tenure >= 70 ? 'bg-emerald-500' : 'bg-orange-500'}`} style={{ width: `${ballisticResult.sub_scores.tenure}%` }} />
                            </div>
                          </div>
                          <div className="p-2 bg-slate-900/50 rounded border border-slate-800/50">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-[8px] uppercase tracking-wider text-slate-500">Backdrop</span>
                              <span className="text-[10px] font-bold text-slate-300">{ballisticResult.sub_scores.backdrop}%</span>
                            </div>
                            <div className="h-0.5 bg-slate-800 rounded-full overflow-hidden">
                              <div className="h-full bg-blue-500" style={{ width: `${ballisticResult.sub_scores.backdrop}%` }} />
                            </div>
                          </div>
                          <div className="p-2 bg-slate-900/50 rounded border border-slate-800/50">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-[8px] uppercase tracking-wider text-slate-500">Firing Open</span>
                              <span className="text-[10px] font-bold text-slate-300">{ballisticResult.sub_scores.firing_openness}%</span>
                            </div>
                            <div className="h-0.5 bg-slate-800 rounded-full overflow-hidden">
                              <div className="h-full bg-slate-500" style={{ width: `${ballisticResult.sub_scores.firing_openness}%` }} />
                            </div>
                          </div>
                          <div className="p-2 bg-slate-900/50 rounded border border-slate-800/50">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-[8px] uppercase tracking-wider text-slate-500">Target Open</span>
                              <span className="text-[10px] font-bold text-slate-300">{ballisticResult.sub_scores.target_openness}%</span>
                            </div>
                            <div className="h-0.5 bg-slate-800 rounded-full overflow-hidden">
                              <div className="h-full bg-slate-500" style={{ width: `${ballisticResult.sub_scores.target_openness}%` }} />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Definition of Safe Tenure */}
                      <div className="p-2.5 bg-emerald-900/10 border border-emerald-500/20 rounded-lg">
                        <h4 className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                          <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Safe Tenure INFO
                        </h4>
                        <p className="text-[9px] leading-relaxed text-slate-400">
                          Ensures both points are on <span className="text-emerald-300">Ontario Crown Land</span> (General Use) and clear of private property, municipal discharge zones, and parks.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Location Section */}
        <div>
          <p className="text-[10px] text-slate-400 uppercase tracking-wider border-b border-slate-800 pb-1 mb-3">Location</p>
          {lat !== null && lng !== null ? (
            <div className="bg-slate-800/50 rounded border border-slate-700 p-3 space-y-2.5">
              <div className="flex justify-between items-center">
                <div className="font-mono text-[11px] text-slate-200 space-y-1">
                  <p><span className="text-slate-500">Lat </span>{lat.toFixed(6)}°</p>
                  <p><span className="text-slate-500">Lng </span>{lng.toFixed(6)}°</p>
                </div>
                <button
                  onClick={() => navigator.clipboard.writeText(`${lat.toFixed(6)}, ${lng.toFixed(6)}`)}
                  className="text-[10px] text-slate-400 hover:text-white bg-slate-700 hover:bg-slate-600 px-2 py-1 rounded transition"
                >
                  Copy
                </button>
              </div>
              <a
                href={googleMapsUrl(lat, lng)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 w-full py-2 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 border border-blue-500/30 rounded text-[10px] font-bold uppercase transition"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Open in Google Maps
              </a>
            </div>
          ) : (
            <p className="text-xs text-slate-500 italic">Coordinates unavailable</p>
          )}
        </div>

        {/* Metrics explanation (Candidates only) */}
        {isCandidate && props.explanation && (
          <div>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider border-b border-slate-800 pb-1 mb-2">Metrics Details</p>
            <pre className="text-[9px] bg-slate-900 border border-slate-800 p-2.5 rounded overflow-x-auto text-slate-400 leading-relaxed">
              {(() => {
                try {
                  const obj = typeof props.explanation === "string" ? JSON.parse(props.explanation) : props.explanation;
                  return JSON.stringify(obj, null, 2);
                } catch {
                  return String(props.explanation);
                }
              })()}
            </pre>
          </div>
        )}
      </div>

      <div className="p-3 bg-slate-900 border-t border-slate-800 text-[10px] text-slate-500 italic">
        {isCandidate 
          ? "Preliminary screen only — verify CLUPA policy before acting."
          : "Land use data sourced from Ontario GeoHub."}
      </div>
    </div>
  );
}
