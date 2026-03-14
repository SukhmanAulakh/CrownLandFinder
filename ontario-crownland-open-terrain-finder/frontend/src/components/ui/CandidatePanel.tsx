/**
 * CandidatePanel — Detail view for a selected candidate: scores, ballistic analysis (firing/target), and manual analysis trigger.
 */
import React, { useMemo } from "react";

interface CandidatePanelProps {
  feature: any | null;
  ballisticResult: any | null;
  onBallisticResult: (res: any) => void;
  onSetManualMode: (mode: 'firing' | 'target' | null) => void;
  onAnalyze: () => void;
  isSearching: boolean;
  manualPoints: { firing?: {lng:number, lat:number}, target?: {lng:number, lat:number} };
  selectionMode: 'firing' | 'target' | null;
  onClearSelection: () => void;
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
  isSearching,
  manualPoints,
  selectionMode,
  onClearSelection,
  onClose 
}: CandidatePanelProps) {
  const [searchError, setSearchError] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);

  if (!feature) return null;

  const props = feature.properties || {};
  const mergedProps = useMemo(() => ({
    ...props,
    ...(ballisticResult || {})
  }), [props, ballisticResult]);

  const centroid = useMemo(() => computeCentroid(feature.geometry), [feature]);
  const [lng, lat] = useMemo(() => {
    // Prefer explicitly provided centroid coordinates from either source
    if (mergedProps.centroid_lat !== undefined && mergedProps.centroid_lng !== undefined) {
      return [mergedProps.centroid_lng, mergedProps.centroid_lat];
    }
    // Fallback to computed geometry centroid
    return centroid ?? [null, null];
  }, [centroid, mergedProps.centroid_lat, mergedProps.centroid_lng]);

  const isCandidate = !!mergedProps.id && (!!mergedProps._is_candidate || mergedProps.classification !== undefined);
  const hasPolicy = !!mergedProps.policy_ident || !!mergedProps.external_id;

  return (
    <div className="absolute right-0 top-0 bottom-0 w-80 bg-slate-950 shadow-2xl z-10 flex flex-col border-l border-slate-700">
      {/* Header */}
      <div className="bg-slate-900 text-white p-4 flex justify-between items-center border-b border-slate-700 shrink-0">
        <div>
          <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">
            {isCandidate ? "Candidate Detail" : "Land Use Detail"}
          </p>
          <h2 className="font-bold text-base text-white">
            {isCandidate ? `Unit #${mergedProps.id}` : mergedProps.area_name || "Selected Area"}
          </h2>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-white transition p-1 rounded hover:bg-slate-700">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="p-4 flex-grow overflow-y-auto space-y-6">
        
        {/* Unified Policy Identification Table */}
        {(hasPolicy || mergedProps.designation_eng) && (
          <div className="space-y-2.5">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Policy Identification</p>
            <div className="area-popup bg-slate-900/40 border border-slate-800 rounded-xl overflow-hidden">
              <h5 className="area-popup-header bg-slate-800/50 p-2.5 border-b border-slate-700 text-[10px] font-bold uppercase tracking-widest text-emerald-400">
                {mergedProps.designation_eng || mergedProps.protected_type || "Crown Land Policy Area"}
              </h5>
              <table className="area-about-table w-full text-[10px]">
                <tbody>
                  <tr className="area-about-tr border-b border-slate-800/50">
                    <td className="area-about-td p-2 text-slate-500 font-medium w-24 border-r border-slate-800/50">Name</td>
                    <td className="area-about-td p-2 text-slate-300">
                      {mergedProps.area_name || mergedProps.name || "Unnamed Area"}
                    </td>
                  </tr>
                  <tr className="area-about-tr border-b border-slate-800/50">
                    <td className="area-about-td p-2 text-slate-500 font-medium border-r border-slate-800/50">Category</td>
                    <td className="area-about-td p-2 text-slate-300">
                      {mergedProps.category_eng || "Not Specified"}
                    </td>
                  </tr>
                  <tr className="area-about-tr">
                    <td className="area-about-td p-2 text-slate-500 font-medium border-r border-slate-800/50 uppercase text-[8px]">Land Use Policy</td>
                    <td className="area-about-td p-2 text-slate-300">
                      <div>
                        <span className="font-bold text-emerald-400">ID: {mergedProps.policy_ident || mergedProps.external_id || "N/A"}</span>
                        <br />
                        {mergedProps.policy_ident && (
                          <a 
                            href={`https://www.lioapplications.lrc.gov.on.ca/services/CLUPA/xmlReader.aspx?xsl=web-primary.xsl&type=primary&POLICY_IDENT=${mergedProps.policy_ident}`}
                            target="_blank" 
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 mt-1 text-sky-400 hover:text-sky-300 transition-colors"
                          >
                            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                            View Report
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Unified Terrain Analysis Section (if Scores Exist) */}
        {(mergedProps.classification || mergedProps.open_land_score !== undefined) && (
          <div className="space-y-3">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Terrain Analysis</p>
            <div className="space-y-3">
              <div>
                <p className="text-[10px] text-slate-500 uppercase mb-1.5 font-medium">Classification</p>
                <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] ${
                   mergedProps.classification === "Higher open-terrain candidate"
                   ? "bg-purple-600/20 text-purple-400 border border-purple-500/30"
                   : "bg-yellow-600/20 text-yellow-400 border border-yellow-500/30"
                }`}>
                  {mergedProps.classification || "Unknown"}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 bg-slate-900/50 rounded border border-slate-800">
                  <p className="text-[9px] text-slate-500 uppercase font-bold mb-1">Open Land</p>
                  <p className="text-xl font-bold text-purple-400 leading-none">{Math.round(mergedProps.open_land_score || 0)} <span className="text-[10px] text-slate-600 font-normal">/ 100</span></p>
                </div>
                <div className="p-2.5 bg-slate-900/50 rounded border border-slate-800">
                  <p className="text-[9px] text-slate-500 uppercase font-bold mb-1">Enclosure</p>
                  <p className="text-xl font-bold text-violet-400 leading-none">{Math.round(mergedProps.terrain_enclosure_score || 0)} <span className="text-[10px] text-slate-600 font-normal">/ 100</span></p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Premium Location Identification Card */}
        <div>
          <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-2.5">Location Identification</p>
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-inner">
            <div className="p-3 bg-slate-800/30 border-b border-slate-700/50">
              <div className="grid grid-cols-1 gap-2.5">
                <div className="flex items-center justify-between group">
                  <div className="flex flex-col">
                    <span className="text-[9px] text-slate-500 uppercase font-bold tracking-tight">Latitude</span>
                    <span className="text-xs font-mono text-slate-200">{lat?.toFixed(6) || "—"}°</span>
                  </div>
                  <button
                    onClick={() => lat && navigator.clipboard.writeText(lat.toFixed(6))}
                    className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-slate-700 rounded transition duration-200"
                    title="Copy Latitude"
                  >
                    <svg className="w-3 h-3 text-slate-400 font-bold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                    </svg>
                  </button>
                </div>
                <div className="flex items-center justify-between group border-t border-slate-700/30 pt-2">
                  <div className="flex flex-col">
                    <span className="text-[9px] text-slate-500 uppercase font-bold tracking-tight">Longitude</span>
                    <span className="text-xs font-mono text-slate-200">{lng?.toFixed(6) || "—"}°</span>
                  </div>
                  <button
                    onClick={() => lng && navigator.clipboard.writeText(lng.toFixed(6))}
                    className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-slate-700 rounded transition duration-200"
                    title="Copy Longitude"
                  >
                    <svg className="w-3 h-3 text-slate-400 font-bold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
            
            {lat && lng && (
              <a 
                href={googleMapsUrl(lat, lng)}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 p-3 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 text-[10px] font-bold uppercase transition duration-200"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Open in Google Maps
              </a>
            )}
          </div>
        </div>


        {/* Ballistics Section */}
        <div className="space-y-4 pt-2 border-t border-slate-800">
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Ballistic Analysis</p>
            {(manualPoints.firing || manualPoints.target) && (
              <button 
                onClick={onClearSelection}
                className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition duration-200 flex items-center justify-center border border-red-500/20"
                title="Clear All Points"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </div>
          
          <div className="flex flex-col gap-2">
            <div className="space-y-1">
              <button
                onClick={() => onSetManualMode(selectionMode === 'firing' ? null : 'firing')}
                className={`w-full py-2.5 rounded-lg border font-bold uppercase tracking-wider text-[11px] flex items-center justify-center gap-2 transition-all duration-200 ${
                  selectionMode === 'firing' 
                    ? "bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-900/40" 
                    : manualPoints.firing 
                      ? "bg-slate-800 border-emerald-500/50 text-emerald-400 shadow-lg shadow-emerald-900/10" 
                      : "bg-slate-800 border-slate-750 text-slate-400 hover:border-emerald-500/50 hover:text-emerald-400"
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {manualPoints.firing ? "Change Shooting Pos" : "Select Shooting Pos"}
              </button>

              {manualPoints.firing && (
                <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-lg p-2 flex items-center justify-between group">
                  <div className="flex gap-3">
                    <div className="flex flex-col">
                      <span className="text-[8px] text-emerald-500/60 uppercase font-bold">LAT</span>
                      <span className="text-xs font-mono text-emerald-400 font-bold">{manualPoints.firing.lat.toFixed(6)}°</span>
                    </div>
                    <div className="flex flex-col border-l border-emerald-500/10 pl-3">
                      <span className="text-[8px] text-emerald-500/60 uppercase font-bold">LNG</span>
                      <span className="text-xs font-mono text-emerald-400 font-bold">{manualPoints.firing.lng.toFixed(6)}°</span>
                    </div>
                  </div>
                  <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => navigator.clipboard.writeText(`${manualPoints.firing?.lat.toFixed(6)}, ${manualPoints.firing?.lng.toFixed(6)}`)}
                      className="p-1.5 hover:bg-emerald-500/10 rounded text-emerald-400/70 hover:text-emerald-400 transition"
                      title="Copy Coordinates"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                      </svg>
                    </button>
                    <a
                      href={googleMapsUrl(manualPoints.firing.lat, manualPoints.firing.lng)}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 hover:bg-emerald-500/10 rounded text-emerald-400/70 hover:text-emerald-400 transition"
                      title="View on Google Maps"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </a>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-1">
              <button
                onClick={() => onSetManualMode(selectionMode === 'target' ? null : 'target')}
                className={`w-full py-2.5 rounded-lg border font-bold uppercase tracking-wider text-[11px] flex items-center justify-center gap-2 transition-all duration-200 ${
                  selectionMode === 'target' 
                    ? "bg-red-600 border-red-500 text-white shadow-lg shadow-red-900/40" 
                    : manualPoints.target 
                      ? "bg-slate-800 border-red-500/50 text-red-400 shadow-lg shadow-red-900/10" 
                      : "bg-slate-800 border-slate-750 text-slate-400 hover:border-red-500/50 hover:text-red-400"
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {manualPoints.target ? "Change Target Pos" : "Select Target Pos"}
              </button>

              {manualPoints.target && (
                <div className="bg-red-950/20 border border-red-500/20 rounded-lg p-2 flex items-center justify-between group">
                  <div className="flex gap-3">
                    <div className="flex flex-col">
                      <span className="text-[8px] text-red-500/60 uppercase font-bold">LAT</span>
                      <span className="text-xs font-mono text-red-400 font-bold">{manualPoints.target.lat.toFixed(6)}°</span>
                    </div>
                    <div className="flex flex-col border-l border-red-500/10 pl-3">
                      <span className="text-[8px] text-red-500/60 uppercase font-bold">LNG</span>
                      <span className="text-xs font-mono text-red-400 font-bold">{manualPoints.target.lng.toFixed(6)}°</span>
                    </div>
                  </div>
                  <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => navigator.clipboard.writeText(`${manualPoints.target?.lat.toFixed(6)}, ${manualPoints.target?.lng.toFixed(6)}`)}
                      className="p-1.5 hover:bg-red-500/10 rounded text-red-400/70 hover:text-red-400 transition"
                      title="Copy Coordinates"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                      </svg>
                    </button>
                    <a
                      href={googleMapsUrl(manualPoints.target.lat, manualPoints.target.lng)}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 hover:bg-red-500/10 rounded text-red-400/70 hover:text-red-400 transition"
                      title="View on Google Maps"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </a>
                  </div>
                </div>
              )}
            </div>

            {isSearching && (
              <div className="w-full py-2.5 mt-1 rounded-lg border border-purple-500/20 bg-purple-600/5 text-purple-400 font-bold uppercase tracking-wider text-[11px] flex items-center justify-center gap-2 animate-pulse">
                <div className="w-3 h-3 border-2 border-t-transparent border-purple-400 rounded-full animate-spin" />
                Analyzing Terrain...
              </div>
            )}
          </div>
        </div>

        {searchError && (
          <div className="p-2.5 bg-red-900/30 border border-red-500/40 rounded-lg animate-in fade-in slide-in-from-top-1 duration-300">
            <p className="text-[10px] text-red-400 font-bold flex items-center gap-1.5 uppercase tracking-tighter text-center justify-center">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {searchError}
            </p>
          </div>
        )}

        {ballisticResult && (
          <div className={`p-4 border rounded-xl animate-in fade-in slide-in-from-top-2 duration-500 ${
            ballisticResult.status === "Infeasible" 
              ? "bg-red-950/40 border-red-500/40 shadow-[0_0_20px_rgba(239,68,68,0.15)]" 
              : (ballisticResult.score >= 80 && ballisticResult.status !== "Infeasible")
                ? "bg-emerald-950/40 border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.15)]" 
                : "bg-slate-900 border-purple-500/30 shadow-[0_4px_12px_rgba(0,0,0,0.3)]"
          }`}>
            <p className={`text-[10px] uppercase font-bold mb-3 flex items-center gap-1.5 ${
              ballisticResult.status === "Infeasible" 
                ? "text-red-400" 
                : (ballisticResult.score >= 80 && ballisticResult.status !== "Infeasible")
                  ? "text-emerald-400" 
                  : "text-purple-400"
            }`}>
              {ballisticResult.status === "Infeasible" ? (
                <svg className="w-3 h-3 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              ) : (
                <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                  (ballisticResult.score >= 80 && ballisticResult.status !== "Infeasible") ? "bg-emerald-500" : "bg-purple-500"
                }`} />
              )}
              Ballistic Profile
            </p>
            <div className="space-y-3.5">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] text-slate-500 uppercase font-bold tracking-tight">Firing Range</p>
                  <p className="text-2xl font-bold text-white tracking-tighter">{ballisticResult.distance_m}m</p>
                  {ballisticResult.bearing && (
                    <p className="text-[9px] text-slate-400 mt-1 uppercase font-bold">Bearing: {ballisticResult.bearing}°</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-slate-500 uppercase font-bold tracking-tight">
                    {ballisticResult.score !== undefined ? "Feasibility" : "Backdrop"}
                  </p>
                  <p className={`text-xs font-black uppercase tracking-tight ${
                    ballisticResult.status === "Infeasible" ? "text-red-400" :
                    ballisticResult.status === "Marginal" ? "text-yellow-400" :
                    "text-emerald-400"
                  }`}>
                    {ballisticResult.score !== undefined ? `${ballisticResult.score}% ${ballisticResult.status}` : ballisticResult.backdrop_type}
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex flex-col gap-3">
                <button
                  onClick={() => {
                    const baseUrl = window.location.origin + window.location.pathname;
                    const params = new URLSearchParams();
                    if (mergedProps.id) params.set('id', String(mergedProps.id));
                    if (manualPoints.firing) params.set('fl', `${manualPoints.firing.lat.toFixed(6)},${manualPoints.firing.lng.toFixed(6)}`);
                    if (manualPoints.target) params.set('tl', `${manualPoints.target.lat.toFixed(6)},${manualPoints.target.lng.toFixed(6)}`);
                    const shareUrl = `${baseUrl}?${params.toString()}`;
                    navigator.clipboard.writeText(shareUrl);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className={`w-full py-2.5 border font-bold uppercase tracking-widest text-[11px] rounded-lg transition duration-200 flex items-center justify-center gap-2 shadow-lg shadow-sky-900/20 ${
                    copied 
                      ? "bg-emerald-600/20 border-emerald-500/40 text-emerald-400" 
                      : "bg-sky-600/20 border-sky-500/40 text-sky-400 hover:bg-sky-600/30"
                  }`}
                >
                  {copied ? (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                      Link Copied!
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                      Copy Share Link
                    </>
                  )}
                </button>

                <p className="text-[10px] text-slate-300 italic leading-relaxed font-medium">
                  "{ballisticResult.recommendation}"
                </p>
              </div>

              {ballisticResult.sub_scores && (
                <div className="grid grid-cols-2 gap-2.5 pt-1">
                  {[
                    { label: "Safe Tenure", score: ballisticResult.sub_scores.tenure, color: "emerald", crit: 70 },
                    { label: "Backdrop", score: ballisticResult.sub_scores.backdrop, color: "blue", crit: 0 },
                    { label: "Firing Open", score: ballisticResult.sub_scores.firing_openness, color: "purple", crit: 0 },
                    { label: "Target Open", score: ballisticResult.sub_scores.target_openness, color: "purple", crit: 0 }
                  ].map((s, idx) => (
                    <div key={idx} className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg">
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-[8px] uppercase font-bold tracking-tighter text-slate-500">{s.label}</span>
                        <span className={`text-[10px] font-black ${s.crit > 0 ? (s.score >= s.crit ? 'text-emerald-400' : 'text-orange-400') : 'text-slate-300'}`}>{s.score}%</span>
                      </div>
                      <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                        <div 
                          className={`h-full opacity-80 ${s.color === 'emerald' ? (s.score >= s.crit ? 'bg-emerald-500' : 'bg-orange-500') : s.color === 'blue' ? 'bg-blue-500' : 'bg-purple-500'}`} 
                          style={{ width: `${s.score}%` }} 
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {ballisticResult.safety_check && (
                <div className={`p-3 border rounded-lg transition-all ${
                  ballisticResult.safety_check.has_downrange_hazard 
                    ? 'bg-red-900/10 border-red-500/40 text-red-400 shadow-[inset_0_0_12px_rgba(239,68,68,0.05)]' 
                    : (!ballisticResult.safety_check.data_integrity?.roads_loaded && !ballisticResult.safety_check.data_integrity?.trails_loaded)
                      ? 'bg-orange-900/10 border-orange-500/30 text-orange-400'
                      : 'bg-emerald-900/10 border-emerald-500/30 text-emerald-400'
                }`}>
                  <h4 className="text-[9px] font-black uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {ballisticResult.safety_check.has_downrange_hazard ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      )}
                    </svg>
                    {ballisticResult.safety_check.backstop_verified ? "Verified Backstop" : "Downrange Buffer Check"}
                  </h4>
                  <p className="text-[9px] leading-relaxed font-semibold">
                    {ballisticResult.safety_check.has_downrange_hazard && (ballisticResult.safety_check.closest_hazard_m < (ballisticResult.distance_m - 5))
                      ? `CONFLICT: Hazard detected ${ballisticResult.safety_check.closest_hazard_fmt} away (Direct line of fire).`
                      : ballisticResult.safety_check.backstop_verified 
                        ? (ballisticResult.safety_check.has_downrange_hazard 
                            ? `CLEAR: Backstop protects hazard behind target (${ballisticResult.safety_check.closest_hazard_fmt} downrange).`
                            : "CLEAR: Natural backstop verified and no hazards in 10km sector.")
                        : ballisticResult.safety_check.has_downrange_hazard 
                          ? `WARNING: Hazard detected ${ballisticResult.safety_check.closest_hazard_fmt} downrange. No backstop verified.`
                          : (!ballisticResult.safety_check.data_integrity?.roads_loaded && !ballisticResult.safety_check.data_integrity?.trails_loaded)
                            ? "⚠️ UNVERIFIED: No infrastructure data loaded. Safety check impossible."
                            : `PASSED: No hazards detected in 10km downrange sector.`}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Metrics explanation (Candidates only) */}
        {isCandidate && mergedProps.explanation && (
          <div>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider border-b border-slate-800 pb-1 mb-2">Metrics Details</p>
            <pre className="text-[9px] bg-slate-900 border border-slate-800 p-2.5 rounded overflow-x-auto text-slate-400 leading-relaxed max-h-40">
              {(() => {
                try {
                  const obj = typeof mergedProps.explanation === "string" ? JSON.parse(mergedProps.explanation) : mergedProps.explanation;
                  return JSON.stringify(obj, null, 2);
                } catch {
                  return String(mergedProps.explanation);
                }
              })()}
            </pre>
          </div>
        )}
      </div>

      <div className="p-3 bg-slate-900 border-t border-slate-800 text-[9px] text-slate-500 italic text-center shrink-0">
        {isCandidate 
          ? "Preliminary screen only — verify CLUPA policy and local rules before acting."
          : "Land use data sourced from Ontario GeoHub Open Data."}
      </div>
    </div>
  );
}
