"use client";

import React, { useMemo, useState } from "react";

interface CandidateListProps {
  features: any[];
  onFlyTo: (feature: any) => void;
  onSelectFeature: (feature: any) => void;
  onClose: () => void;
}

const CLASSIFICATION_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  "Higher open-terrain candidate": { bg: "bg-purple-900/60", text: "text-purple-200", dot: "bg-purple-400" },
  "Candidate for manual review":   { bg: "bg-violet-900/60", text: "text-violet-200", dot: "bg-violet-400" },
  "Excluded":                       { bg: "bg-slate-800/80",  text: "text-slate-400",  dot: "bg-slate-500" },
};

type SortKey = "id" | "area_m2" | "open_land_score" | "terrain_enclosure_score" | "classification";

export default function CandidateList({ features, onFlyTo, onSelectFeature, onClose }: CandidateListProps) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("open_land_score");
  const [sortDesc, setSortDesc] = useState(true);
  const [filterClass, setFilterClass] = useState<string>("all");

  const filtered = useMemo(() => {
    let arr = features;
    // Filter by classification
    if (filterClass !== "all") arr = arr.filter(f => f.properties?.classification === filterClass);
    // Search by ID
    if (search.trim()) arr = arr.filter(f => String(f.properties?.id ?? "").includes(search.trim()));
    // Sort
    arr = [...arr].sort((a, b) => {
      const av = a.properties?.[sortKey] ?? 0;
      const bv = b.properties?.[sortKey] ?? 0;
      if (typeof av === "string") return sortDesc ? bv.localeCompare(av) : av.localeCompare(bv);
      return sortDesc ? (bv as number) - (av as number) : (av as number) - (bv as number);
    });
    return arr;
  }, [features, search, sortKey, sortDesc, filterClass]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDesc(d => !d);
    else { setSortKey(key); setSortDesc(true); }
  };

  const SortButton = ({ k, label }: { k: SortKey; label: string }) => (
    <button
      onClick={() => toggleSort(k)}
      className={`text-[10px] px-1.5 py-0.5 rounded transition ${sortKey === k ? "bg-purple-600 text-white" : "text-slate-400 hover:text-slate-200"}`}
    >
      {label} {sortKey === k ? (sortDesc ? "↓" : "↑") : ""}
    </button>
  );

  const classes = Array.from(new Set(features.map(f => f.properties?.classification).filter(Boolean)));

  return (
    <div className="absolute left-0 top-0 bottom-0 w-80 bg-slate-900/95 backdrop-blur-md border-r border-slate-700 shadow-2xl z-20 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700 shrink-0">
        <div>
          <h2 className="text-white font-bold text-sm tracking-wide">Candidates</h2>
          <p className="text-slate-400 text-xs">{filtered.length} of {features.length} shown</p>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-white transition p-1 rounded hover:bg-slate-700">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Filters */}
      <div className="px-3 py-2 border-b border-slate-800 shrink-0 space-y-2">
        <input
          type="text"
          placeholder="Search by ID…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500 transition"
        />
        <div className="flex gap-1 flex-wrap">
          <button
            onClick={() => setFilterClass("all")}
            className={`text-[10px] px-2 py-0.5 rounded-full border transition ${filterClass === "all" ? "bg-purple-600 border-purple-500 text-white" : "border-slate-600 text-slate-400 hover:border-slate-400"}`}
          >All</button>
          {classes.map(c => {
            const shortLabel = c === "Higher open-terrain candidate" ? "Higher" : c === "Candidate for manual review" ? "Review" : "Excluded";
            return (
              <button key={c} onClick={() => setFilterClass(c === filterClass ? "all" : c)}
                className={`text-[10px] px-2 py-0.5 rounded-full border transition ${filterClass === c ? "bg-purple-600 border-purple-500 text-white" : "border-slate-600 text-slate-400 hover:border-slate-400"}`}>
                {shortLabel}
              </button>
            );
          })}
        </div>
        <div className="flex gap-1 items-center">
          <span className="text-[10px] text-slate-500 mr-1">Sort:</span>
          <SortButton k="open_land_score" label="Open" />
          <SortButton k="terrain_enclosure_score" label="Enclosure" />
          <SortButton k="area_m2" label="Area" />
          <SortButton k="id" label="ID" />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {filtered.length === 0 ? (
          <div className="p-6 text-center text-slate-500 text-xs">No candidates match your filter.</div>
        ) : (
          filtered.map((feature, i) => {
            const p = feature.properties ?? {};
            const cls = p.classification ?? "Unknown";
            const colors = CLASSIFICATION_COLORS[cls] ?? { bg: "bg-slate-800/60", text: "text-slate-300", dot: "bg-slate-400" };
            const openScore = Math.round(p.open_land_score ?? 0);
            const enclScore = Math.round(p.terrain_enclosure_score ?? 0);
            const areakm2 = p.area_m2 ? (p.area_m2 / 1_000_000).toFixed(2) : "—";

            return (
              <div key={p.id ?? i}
                className={`p-3 border-b border-slate-800 hover:bg-slate-800/60 transition group`}>
                {/* Classification badge */}
                <div className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full mb-1.5 ${colors.bg} ${colors.text}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
                  {cls === "Higher open-terrain candidate" ? "Higher Candidate" :
                   cls === "Candidate for manual review"   ? "Manual Review"   : cls}
                </div>

                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-slate-200 text-xs font-medium">Unit #{p.id}</p>
                    <p className="text-slate-500 text-[10px]">{areakm2} km²</p>
                    <div className="flex gap-2 mt-1">
                      <span className="text-[10px] text-slate-400">Open: <span className="text-purple-300 font-medium">{openScore}</span></span>
                      <span className="text-[10px] text-slate-400">Encl: <span className="text-violet-300 font-medium">{enclScore}</span></span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1 shrink-0">
                    {/* Fly-to button */}
                    <button
                      onClick={() => onFlyTo(feature)}
                      title="Find on map"
                      className="flex items-center gap-1 bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-medium px-2 py-1 rounded transition"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Find
                    </button>
                    {/* Detail button */}
                    <button
                      onClick={() => onSelectFeature(feature)}
                      title="View details"
                      className="flex items-center gap-1 bg-slate-700 hover:bg-slate-600 text-slate-200 text-[10px] font-medium px-2 py-1 rounded transition"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      Detail
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-slate-800 shrink-0 text-[10px] text-slate-500">
        Click "Find" to fly the map to a candidate · Click "Detail" to inspect scores
      </div>
    </div>
  );
}
