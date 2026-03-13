"use client";

import { useState } from "react";

export default function AdminImportPage() {
  const [status, setStatus] = useState<string>("Idle");

  const runImport = async (dataset: string) => {
    setStatus(`Triggering import for ${dataset}...`);
    // Example only, normally would hit the FastAPI endpoints
    setTimeout(() => {
      setStatus(`${dataset} import job queued successfully.`);
    }, 1000);
  };

  const runScoring = async () => {
    setStatus("Triggering global scoring pipeline...");
    setTimeout(() => {
      setStatus("Scoring job queued in Celery.");
    }, 1000);
  };

  const jobs = [
    { id: "clupa", name: "Crown Land Provincial", endpoint: "/api/admin/import/clupa" },
    { id: "municipal", name: "Municipal Boundaries", endpoint: "/api/admin/import/municipal-boundaries" },
    { id: "protected", name: "Protected Areas", endpoint: "/api/admin/import/protected-areas" },
    { id: "roads", name: "Roads", endpoint: "/api/admin/import/roads" },
    { id: "trails", name: "OTN Trails", endpoint: "/api/admin/import/trails" },
    { id: "dem", name: "DEM Tiles", endpoint: "/api/admin/import/dem" },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-12">
      <header className="bg-slate-800 text-white py-4 px-6 mb-8 shadow-md">
        <h1 className="text-xl font-bold">System Administration</h1>
      </header>
      
      <main className="max-w-4xl mx-auto px-6">
        <div className="bg-white p-6 rounded shadow-sm border border-slate-200 mb-8">
          <h2 className="text-lg font-bold mb-4 text-slate-800">System Status</h2>
          <div className="bg-slate-100 p-4 rounded text-sm font-mono text-slate-700">
            {status}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <section>
            <h3 className="text-lg font-bold mb-4 text-slate-800 border-b pb-2">Manual Data Ingestion Pipeline</h3>
            <div className="space-y-3">
              {jobs.map(job => (
                <div key={job.id} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded shadow-sm hover:border-slate-300">
                  <span className="font-medium text-slate-700">{job.name}</span>
                  <button 
                    onClick={() => runImport(job.name)}
                    className="px-3 py-1 bg-slate-100 border border-slate-300 rounded text-slate-700 text-sm hover:bg-slate-200 transition"
                  >
                    Run Job
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-lg font-bold mb-4 text-slate-800 border-b pb-2">GIS Processing</h3>
            <p className="text-sm text-slate-600 mb-4">
              Executes the candidate generation and scoring pipeline against all ingested datasets.
            </p>
            <button 
              onClick={runScoring}
              className="w-full px-4 py-3 bg-blue-600 text-white font-bold rounded shadow hover:bg-blue-700 transition"
            >
              Run Global Scoring Engine
            </button>
          </section>
        </div>
      </main>
    </div>
  );
}
