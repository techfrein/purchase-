export default function NewRequestLoading() {
  return (
    <div className="max-w-5xl mx-auto animate-pulse">
      <div className="rounded-3xl bg-white border p-8 mb-8">
        <div className="h-6 w-32 bg-slate-200 rounded mb-4" />
        <div className="h-10 w-2/3 bg-slate-200 rounded mb-3" />
        <div className="h-4 bg-slate-200 rounded w-1/2 mb-6" />
        <div className="h-14 bg-slate-200 rounded-2xl" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="border rounded-3xl bg-white overflow-hidden">
            <div className="h-48 bg-slate-200" />
            <div className="p-5 space-y-3">
              <div className="h-5 bg-slate-200 rounded w-4/5" />
              <div className="h-8 bg-slate-200 rounded w-1/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}