export default function ProvenanceCard() {
  return (
    <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg mt-6">
      <h3 className="font-semibold text-slate-800 mb-3">Data Provenance</h3>
      <div className="text-sm text-slate-600 space-y-2">
        <div className="flex justify-between border-b border-slate-200 pb-2">
          <span>Crown Land Use Policy Area</span>
          <span className="font-medium">Ontario GeoHub (Updated 2024)</span>
        </div>
        <div className="flex justify-between border-b border-slate-200 pb-2">
          <span>Provincial DEM</span>
          <span className="font-medium">Ontario GeoHub</span>
        </div>
        <div className="flex justify-between pb-2">
          <span>Municipal Boundaries</span>
          <span className="font-medium">LIO REST Services</span>
        </div>
      </div>
      <p className="text-xs text-slate-500 mt-4 italic">
        Scores are calculated algorithmically based on the above public datasets.
        Data may be outdated or incomplete.
      </p>
    </div>
  );
}
