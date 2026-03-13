"use client";

import Link from "next/link";
import ScoreCard from "@/components/ScoreCard";
import ProvenanceCard from "@/components/ProvenanceCard";
import WarningBanner from "@/components/WarningBanner";

export default function CandidateDetailPage({ params }: { params: { id: string } }) {
  // In a real app we would fetch the candidate by ID.
  const candidateId = params.id;
  
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-12">
      <header className="bg-white border-b border-slate-200 py-4 px-6 mb-8 shadow-sm">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-blue-600 hover:text-blue-800 font-medium">
            &larr; Back to Map
          </Link>
          <h1 className="text-xl font-bold">Crown Land Open Terrain Finder</h1>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6">
        <WarningBanner />
        
        <div className="flex items-center justify-between mb-8 mt-6">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-800">Candidate #{candidateId}</h2>
            <p className="text-slate-500 mt-1">CLUPA Policy Area ID: G1842</p>
          </div>
          <span className="px-4 py-2 bg-green-100 text-green-800 font-bold uppercase rounded shadow-sm border border-green-200">
            Candidate for manual review
          </span>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <ScoreCard 
            title="Open Land Score" 
            score={65} 
            explanation={{ area_m2: 45000, road_penalty: -12, trail_penalty: 0 }} 
          />
          <ScoreCard 
            title="Terrain Enclosure Score" 
            score={42} 
            explanation={{ local_relief: 120, rising_fraction: 0.35, concavity: 12 }} 
          />
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 mb-8">
          <h3 className="text-lg font-semibold mb-4 border-b pb-2">Location Context</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-slate-500 font-medium">Primary Municipality</p>
              <p className="text-slate-800 font-semibold text-base">Unincorporated</p>
            </div>
            <div>
              <p className="text-slate-500 font-medium">Intersecting Municipalities</p>
              <p className="text-slate-800 font-semibold text-base">None</p>
            </div>
            <div>
              <p className="text-slate-500 font-medium">Exclusion Reasons</p>
              <p className="text-slate-800 font-semibold text-base">None detected in parameters.</p>
            </div>
          </div>
        </div>

        <ProvenanceCard />
      </main>
    </div>
  );
}
