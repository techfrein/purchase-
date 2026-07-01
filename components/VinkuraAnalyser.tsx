import type { Insight, Severity } from "@/lib/analyser";

const SEV_BG: Record<Severity, string> = {
  good: "sev-good ring-[var(--sage-200)]",
  warn: "sev-warn ring-[var(--honey-200)]",
  bad: "sev-bad ring-[var(--brick-200)]",
  neutral: "sev-neutral ring-[var(--stone-200)]",
};

const SEV_TEXT: Record<Severity, string> = {
  good: "sev-text-good",
  warn: "sev-text-warn",
  bad: "sev-text-bad",
  neutral: "sev-text-neutral",
};

const SEV_DOT: Record<Severity, string> = {
  good: "sev-dot-good",
  warn: "sev-dot-warn",
  bad: "sev-dot-bad",
  neutral: "sev-dot-neutral",
};

const METRIC_TONE: Record<Severity, string> = {
  good: "chip-sage",
  warn: "chip-honey",
  bad: "chip-brick",
  neutral: "chip-neutral",
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
    <div className={`overflow-hidden rounded-2xl ring-1 ${SEV_BG[severity]} ${compact ? "p-3.5" : "p-5"}`}>
      <div className="flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary text-white">
          <VinkuraMark className="h-3.5 w-3.5" />
        </span>
        <span className="accent-teal text-xs font-bold uppercase tracking-wide">Vinkura Smart Analyser</span>
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
