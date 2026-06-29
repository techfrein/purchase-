export default function PurchasesLoading() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 w-48 bg-slate-200 rounded-xl" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card p-5">
            <div className="h-5 w-24 bg-slate-200 rounded mb-3" />
            <div className="h-4 bg-slate-200 rounded w-3/4 mb-4" />
            <div className="flex gap-2">
              <div className="h-3 w-16 bg-slate-200 rounded" />
              <div className="h-3 w-12 bg-slate-200 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}