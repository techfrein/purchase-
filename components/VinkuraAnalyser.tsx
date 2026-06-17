import type { Insight, Severity } from "@/lib/analyser";

const SEV_RING: Record<Severity, string> = {
  good: "from-emerald-500/10 to-emerald-500/0 ring-emerald-100",
  warn: "from-amber-500/10 to-amber-500/0 ring-amber-100",
  bad: "from-red-500/10 to-red-500/0 ring-red-100",
  neutral: "from-slate-500/10 to-slate-500/0 ring-slate-100",
};

const SEV_TEXT: Record<Severity, string> = {
  good: "text-emerald-700",
  warn: "text-amber-700",
  bad: "text-red-600",
  neutral: "text-slate-700",
};

const SEV_DOT: Record<Severity, string> = {
  good: "bg-emerald-500",
  warn: "bg-amber-500",
  bad: "bg-red-500",
  neutral: "bg-slate-400",
};

const METRIC_TONE: Record<Severity, string> = {
  good: "bg-emerald-50 text-emerald-700",
  warn: "bg-amber-50 text-amber-700",
  bad: "bg-red-50 text-red-600",
  neutral: "bg-slate-100 text-slate-600",
};

function VinkuraMark({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13l4 4 5-9 4 7 5-11" />
    </svg>
  );
}

/**
 * Vinkura Smart Analyser card — renders a rule-based pricing insight.
 * `compact` is for inline use (dashboard rows / approval modals).
 */
export default function VinkuraAnalyser({
  insight,
  compact = false,
}: {
  insight: Insight;
  compact?: boolean;
}) {
  const { severity } = insight;

  return (
    <div className={`overflow-hidden rounded-2xl bg-gradient-to-br ring-1 ${SEV_RING[severity]} ${compact ? "p-3.5" : "p-5"}`}>
      <div className="flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary text-white">
          <VinkuraMark className="h-3.5 w-3.5" />
        </span>
        <span className="text-xs font-bold uppercase tracking-wide text-primary-deep">Vinkura Smart Analyser</span>
        <span className={`ml-auto flex items-center gap-1.5 text-[0.7rem] font-semibold ${SEV_TEXT[severity]}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${SEV_DOT[severity]}`} />
          {insight.confidence}% confidence
        </span>
      </div>

      <div className={`mt-3 font-bold text-slate-900 ${compact ? "text-base" : "text-lg"}`}>
        {insight.headline}
      </div>
      <p className="mt-1 text-sm leading-relaxed text-slate-600">{insight.detail}</p>

      {insight.metrics.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {insight.metrics.map((m, i) => (
            <span key={i} className={`chip ${METRIC_TONE[m.tone]}`}>
              <span className="opacity-70">{m.label}</span>
              <span className="font-bold">{m.value}</span>
            </span>
          ))}
        </div>
      )}

      <div className="mt-3 flex items-center gap-2 rounded-xl bg-white/70 px-3 py-2 text-sm">
        <span className={`font-semibold ${SEV_TEXT[severity]}`}>Recommendation</span>
        <span className="text-slate-700">{insight.recommendation}</span>
      </div>

      {/* Confidence bar */}
      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/60">
        <div
          className={`h-full rounded-full ${SEV_DOT[severity]}`}
          style={{ width: `${insight.confidence}%` }}
        />
      </div>
    </div>
  );
}
