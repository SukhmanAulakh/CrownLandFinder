"use client";
/**
 * Home page: map, candidate list, layer controls, ballistic panel, measurement tool.
 * Restores deep-link state (candidate, pins, map view) from URL search params.
 */
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import CandidatePanel from '@/components/ui/CandidatePanel';
import CandidateList from '@/components/ui/CandidateList';
import LayerControl, { LAYERS } from '@/components/ui/LayerControl';
import type { MapHandle } from '@/components/map/MapView';
import MapLegend from "@/components/ui/MapLegend";
import MeasurementPanel from "@/components/ui/MeasurementPanel";

/**
 * Calculates the great-circle distance between two points on a sphere using the haversine formula.
 * Used for accurate geodesic measurements on the map surface.
 * @returns Distance in meters
 */
function haversine(p1: {lng: number, lat: number}, p2: {lng: number, lat: number}) {
  const R = 6371000; // Earth's mean radius in meters
  const dLat = (p2.lat - p1.lat) * Math.PI / 180;
  const dLng = (p2.lng - p1.lng) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(p1.lat * Math.PI / 180) * Math.cos(p2.lat * Math.PI / 180) * 
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Dynamically import MapView so mapbox doesn't crash on SSR
const MapView = dynamic(
  () => import('@/components/map/MapView'),
  { ssr: false, loading: () => <div className="w-full h-full bg-slate-900 animate-pulse flex items-center justify-center text-slate-500 text-sm">Loading Map Engine…</div> }
);

export default function Home() {
  // MapView exposes flyToFeature via onMapReady callback (forwardRef breaks with next/dynamic)
  const mapHandleRef = useRef<MapHandle | null>(null);
  const handleMapReady = useCallback((handle: MapHandle) => {
    mapHandleRef.current = handle;
  }, []);

  const [selectedFeature, setSelectedFeature] = useState<any | null>(null);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [showCandidateList, setShowCandidateList] = useState(false);

  const defaultLayers = LAYERS.filter(l => l.defaultOn).map(l => l.id);
  const [activeLayers, setActiveLayers] = useState<string[]>(defaultLayers);
  const [baseLayer, setBaseLayer] = useState<'outdoors' | 'satellite'>('satellite');
  const [showTerrain, setShowTerrain] = useState(true);
  const [candidateOpacity, setCandidateOpacity] = useState(0.8);
  const [clupaOpacity, setClupaOpacity] = useState(0.8);
  const [ballisticResult, setBallisticResult] = useState<any | null>(null);
  const [manualMode, setManualMode] = useState<'firing' | 'target' | null>(null);
  const [manualPoints, setManualPoints] = useState<{ firing?: {lng:number, lat:number}, target?: {lng:number, lat:number} }>({});
  const [isSearchingBallistics, setIsSearchingBallistics] = useState(false);

  // Measurement Tool State
  const [isMeasuring, setIsMeasuring] = useState(false);
  const [measurePoints, setMeasurePoints] = useState<{lng: number, lat: number}[]>([]);
  const [measureDistances, setMeasureDistances] = useState<number[]>([]);

  const handleToggleMeasurement = () => {
    const nextState = !isMeasuring;
    setIsMeasuring(nextState);
    // Ensure only one primary map interaction mode is active at a time
    if (nextState) {
      setManualMode(null); 
    }
  };

  const handleAddMeasurePoint = useCallback((point: {lng: number, lat: number}) => {
    setMeasurePoints(prev => {
      if (prev.length >= 20) return prev;
      const next = [...prev, point];
      if (next.length > 1) {
        const p1 = next[next.length - 2];
        const d = haversine(p1, point);
        setMeasureDistances(dPrev => [...dPrev, d]);
      }
      return next;
    });
  }, []);

  const handleClearMeasure = () => {
    setMeasurePoints([]);
    setMeasureDistances([]);
  };

  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  const handleMapPointSelection = useCallback((coords: { lng: number, lat: number }) => {
    if (!manualMode) return;

    setBallisticResult(null); // Reset analysis on new point drop
    setManualPoints(prev => {
      const newPoints = { ...prev };
      if (manualMode === 'firing') newPoints.firing = coords;
      else if (manualMode === 'target') newPoints.target = coords;
      
      // Update ballisticResult for a "preview" in MapView
      setBallisticResult({
        firing_position: newPoints.firing,
        target_position: newPoints.target,
        distance_m: 0,
        status: "Draft",
        recommendation: "Select positions."
      });
      
      return newPoints;
    });
    setManualMode(null);
  }, [manualMode]);

  const handleAnalyzeManual = useCallback(async () => {
    if (!manualPoints.firing || !manualPoints.target) return;
    
    setIsSearchingBallistics(true);
    try {
      const res = await fetch(`${baseUrl}/api/search/ballistic/manual`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firing_pos: manualPoints.firing,
          target_pos: manualPoints.target
        })
      });
      if (res.ok) {
        const data = await res.json();
        setBallisticResult({
          ...data,
          firing_position: manualPoints.firing,
          target_position: manualPoints.target
        });
      }
    } catch (err) {
      console.error("Manual analysis failed:", err);
    } finally {
      setIsSearchingBallistics(false);
    }
  }, [manualPoints, baseUrl]);

  const handleClearManualPoints = useCallback(() => {
    setManualPoints({});
    setBallisticResult(null);
    setManualMode(null);
  }, []);

  // Automatically trigger analysis when both points are set or updated
  useEffect(() => {
    if (manualPoints.firing && manualPoints.target) {
      handleAnalyzeManual();
    }
  }, [manualPoints.firing, manualPoints.target, handleAnalyzeManual]);

  const handleToggleLayer = (layerId: string) => {
    setActiveLayers(prev =>
      prev.includes(layerId) ? prev.filter(id => id !== layerId) : [...prev, layerId]
    );
  };

  const handleCandidatesLoaded = useCallback((features: any[]) => {
    setCandidates(features);
    if (features.length > 0) setShowCandidateList(false);
  }, []);

  const handleFlyTo = useCallback((feature: any) => {
    mapHandleRef.current?.flyToFeature(feature);
  }, []);

  const searchParams = useSearchParams();
  const [hasRestoredFromUrl, setHasRestoredFromUrl] = useState(false);
  const [isRestoringFromUrl, setIsRestoringFromUrl] = useState(false);

  // Check for URL restoration on mount to avoid hydration mismatch
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has('id') || params.has('fl') || params.has('tl')) {
      setIsRestoringFromUrl(true);
    }
  }, []);

  // Restore state from URL on mount/load
  useEffect(() => {
    if (candidates.length === 0 || hasRestoredFromUrl) return;

    const id = searchParams.get('id');
    const fl = searchParams.get('fl');
    const tl = searchParams.get('tl');

    if (id) {
      const feature = candidates.find(f => String(f.properties?.id) === id);
      if (feature) {
        setSelectedFeature(feature);
        handleFlyTo(feature);
      }
    }

    const newPoints: any = {};
    if (fl) {
      const [lat, lng] = fl.split(',').map(Number);
      if (!isNaN(lat) && !isNaN(lng)) newPoints.firing = { lat, lng };
    }
    if (tl) {
      const [lat, lng] = tl.split(',').map(Number);
      if (!isNaN(lat) && !isNaN(lng)) newPoints.target = { lat, lng };
    }

    if (Object.keys(newPoints).length > 0) {
      setManualPoints(newPoints);
    }

    setHasRestoredFromUrl(true);
    setIsRestoringFromUrl(false);
  }, [candidates, searchParams, hasRestoredFromUrl, handleFlyTo]);

  return (
    <main className="flex h-screen w-full flex-col overflow-hidden bg-slate-950 relative">
      {/* ── Top Navigation Bar ── */}
      <nav className="h-14 bg-slate-900 border-b border-slate-700 flex items-center px-4 shadow-md z-20 shrink-0 gap-3">
        <div className="flex items-center gap-2 mr-4">
          <svg className="w-5 h-5 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h1 className="text-white font-bold tracking-wide text-sm hidden sm:block">
            Ontario Crown Land Open Terrain Finder
          </h1>
          <h1 className="text-white font-bold text-sm sm:hidden">Crown Land Finder</h1>
        </div>

        <button
          onClick={() => setShowCandidateList(v => !v)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition border ${
            showCandidateList
              ? 'bg-purple-600 border-purple-500 text-white'
              : 'bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <span>Candidates</span>
          {candidates.length > 0 && (
            <span className="ml-0.5 bg-purple-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
              {candidates.length}
            </span>
          )}
        </button>

        <div className="ml-auto flex items-center gap-2">
          <span className="bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded-full text-xs animate-pulse border border-emerald-500/30">
            Live Map
          </span>
        </div>
      </nav>

      {/* ── Main Content ── */}
      <div className="flex-1 relative w-full overflow-hidden">
        {showCandidateList && (
          <CandidateList
            features={candidates}
            onFlyTo={handleFlyTo}
            onSelectFeature={(f) => { setSelectedFeature(f); setBallisticResult(null); }}
            onClose={() => setShowCandidateList(false)}
          />
        )}

        {/* Map — shifted right when list is open */}
        <div className={`absolute inset-0 transition-all duration-300 ${showCandidateList ? 'left-80' : 'left-0'}`}>
          <MapView
            activeLayers={activeLayers}
            baseLayer={baseLayer}
            showTerrain={showTerrain}
            candidateOpacity={candidateOpacity}
            clupaOpacity={clupaOpacity}
            ballisticResult={ballisticResult}
            selectionMode={manualMode}
            onMapClick={handleMapPointSelection}
            onFeatureClassify={(f) => { setSelectedFeature(f); setBallisticResult(null); }}
            onCandidatesLoaded={handleCandidatesLoaded}
            onMapReady={handleMapReady}
            // Measurement
            isMeasuring={isMeasuring}
            measurePoints={measurePoints}
            onAddMeasurePoint={handleAddMeasurePoint}
          />
        </div>

        {/* Layer control floats above the map */}
        <div className={`absolute top-4 z-10 transition-all duration-300 ${showCandidateList ? 'left-[340px]' : 'left-4'}`}>
          <LayerControl 
            activeLayers={activeLayers} 
            onToggleLayer={handleToggleLayer}
            baseLayer={baseLayer}
            onSetBaseLayer={setBaseLayer}
            showTerrain={showTerrain}
            onToggleTerrain={() => setShowTerrain(v => !v)}
            candidateOpacity={candidateOpacity}
            onSetCandidateOpacity={setCandidateOpacity}
            clupaOpacity={clupaOpacity}
            onSetClupaOpacity={setClupaOpacity}
          />
        </div>

        {/* Floating Controls — Shifted left to avoid Mapbox zoom controls */}
        <div className="absolute top-6 right-16 z-10 flex flex-col gap-3">
          <button 
            onClick={handleToggleMeasurement}
            className={`p-3 rounded-xl border transition shadow-xl flex items-center justify-center ${
              isMeasuring 
              ? 'bg-sky-500 border-sky-400 text-white' 
              : 'bg-slate-950/80 backdrop-blur-md border-slate-700 text-slate-400 hover:text-white hover:border-slate-500'
            }`}
            title="Measurement Tool"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </button>
        </div>

        {selectedFeature && (
          <CandidatePanel
            feature={selectedFeature}
            ballisticResult={ballisticResult}
            onBallisticResult={setBallisticResult}
            onSetManualMode={setManualMode}
            onAnalyze={handleAnalyzeManual}
            isSearching={isSearchingBallistics}
            manualPoints={manualPoints}
            selectionMode={manualMode}
            onClearSelection={handleClearManualPoints}
            onClose={() => setSelectedFeature(null)}
          />
        )}

        {isMeasuring && (
          <MeasurementPanel
            points={measurePoints}
            distances={measureDistances}
            onClear={handleClearMeasure}
            onClose={() => setIsMeasuring(false)}
          />
        )}
      </div>

      {/* Shared Link Restoration Loader */}
      {isRestoringFromUrl && (
        <div className="absolute inset-0 z-[100] bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center transition-all duration-500">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-sky-500/20 border-t-sky-500 rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <svg className="w-8 h-8 text-sky-400 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </div>
          </div>
          <div className="mt-8 text-center">
            <h3 className="text-xl font-black text-white uppercase tracking-[0.2em]">Restoring Shared Case</h3>
            <p className="text-sky-400/60 text-xs font-bold uppercase tracking-widest mt-2">Finding Terrain Position & Analysis Data</p>
          </div>
          <div className="mt-12 flex gap-1.5">
            <div className="w-1.5 h-1.5 bg-sky-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
            <div className="w-1.5 h-1.5 bg-sky-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
            <div className="w-1.5 h-1.5 bg-sky-500 rounded-full animate-bounce"></div>
          </div>
        </div>
      )}
    </main>
  );
}
