export default function ScoreCard({ title, score, explanation }: { title: string, score: number, explanation: any }) {
  const getScoreColor = (s: number) => {
    if (s >= 75) return "text-green-600";
    if (s >= 40) return "text-amber-600";
    return "text-red-600";
  };
  
  return (
    <div className="bg-white border text-card-foreground shadow-sm rounded-lg p-6">
      <h3 className="text-lg font-semibold leading-none tracking-tight text-slate-800 mb-2">{title}</h3>
      <div className={`text-4xl font-bold ${getScoreColor(score)} mb-4`}>
        {score}
      </div>
      <div className="space-y-2">
        <p className="text-sm font-medium text-slate-700">Metrics Breakdown:</p>
        <ul className="text-sm text-slate-500 space-y-1">
          {explanation && Object.entries(explanation).map(([k, v]) => (
            <li key={k} className="flex justify-between">
              <span className="capitalize">{k.replace(/_/g, ' ')}</span>
              <span className="font-medium text-slate-700">{String(v)}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
