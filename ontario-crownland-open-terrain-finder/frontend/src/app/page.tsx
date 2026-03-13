"use client";

import React, { useState, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import CandidatePanel from '@/components/ui/CandidatePanel';
import CandidateList from '@/components/ui/CandidateList';
import LayerControl, { LAYERS } from '@/components/ui/LayerControl';
import type { MapHandle } from '@/components/map/MapView';

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
  const [baseLayer, setBaseLayer] = useState<'outdoors' | 'satellite'>('outdoors');
  const [showTerrain, setShowTerrain] = useState(true);
  const [ballisticResult, setBallisticResult] = useState<any | null>(null);

  const handleToggleLayer = (layerId: string) => {
    setActiveLayers(prev =>
      prev.includes(layerId) ? prev.filter(id => id !== layerId) : [...prev, layerId]
    );
  };

  const handleCandidatesLoaded = useCallback((features: any[]) => {
    setCandidates(features);
    if (features.length > 0) setShowCandidateList(true);
  }, []);

  const handleFlyTo = useCallback((feature: any) => {
    mapHandleRef.current?.flyToFeature(feature);
  }, []);

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
            ballisticResult={ballisticResult}
            onFeatureClassify={(f) => { setSelectedFeature(f); setBallisticResult(null); }}
            onCandidatesLoaded={handleCandidatesLoaded}
            onMapReady={handleMapReady}
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
          />
        </div>

        {selectedFeature && (
          <CandidatePanel
            feature={selectedFeature}
            ballisticResult={ballisticResult}
            onBallisticResult={setBallisticResult}
            onClose={() => setSelectedFeature(null)}
          />
        )}
      </div>
    </main>
  );
}
