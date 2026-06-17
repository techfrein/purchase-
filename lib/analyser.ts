/**
 * Vinkura Smart Analyser — rule-based pricing insight.
 *
 * Pure, synchronous, zero external calls. Turns the data we already have
 * (vendor quote, best online price, listings spread, category flag history)
 * into a compact, human-readable verdict the owner/admin can act on quickly.
 */

export type Severity = "good" | "warn" | "bad" | "neutral";

export type AnalyserInput = {
  unitPrice: number | null;
  quantity: number;
  bestOnlinePrice: number | null;
  bestOnlineSource?: string | null;
  potentialSaving: number | null;
  verdict: string;
  /** All comparable listing prices found for this purchase. */
  listingPrices?: number[];
  /** Optional category benchmark: flagged share + sample size. */
  category?: { flaggedPct: number; sample: number } | null;
};

export type Insight = {
  severity: Severity;
  /** One-line headline, e.g. "23% above market". */
  headline: string;
  /** Short supporting sentence. */
  detail: string;
  /** Suggested action label. */
  recommendation: string;
  /** 0–100 confidence based on how much data we had. */
  confidence: number;
  /** Optional numeric badges to render. */
  metrics: { label: string; value: string; tone: Severity }[];
};

function pct(n: number) {
  return `${n > 0 ? "+" : ""}${n.toFixed(1)}%`;
}

export function analysePurchase(input: AnalyserInput): Insight {
  const { unitPrice, quantity, bestOnlinePrice, potentialSaving, verdict } = input;
  const prices = (input.listingPrices ?? []).filter((p) => p > 0).sort((a, b) => a - b);
  const metrics: Insight["metrics"] = [];

  // Confidence: more listings + a known vendor price = more trustworthy.
  let confidence = 25;
  if (unitPrice != null) confidence += 20;
  confidence += Math.min(prices.length, 8) * 6; // up to +48
  if (input.category && input.category.sample >= 3) confidence += 7;
  confidence = Math.min(confidence, 99);

  const diffPct =
    bestOnlinePrice != null && unitPrice != null && bestOnlinePrice > 0
      ? ((unitPrice - bestOnlinePrice) / bestOnlinePrice) * 100
      : null;

  if (diffPct != null) {
    metrics.push({
      label: "vs. market",
      value: pct(diffPct),
      tone: diffPct > 5 ? "bad" : diffPct < -2 ? "good" : "neutral",
    });
  }
  if (prices.length >= 2) {
    metrics.push({ label: "online low", value: inrShort(prices[0]), tone: "neutral" });
    metrics.push({ label: "online high", value: inrShort(prices[prices.length - 1]), tone: "neutral" });
  }
  if (input.category && input.category.sample >= 3) {
    metrics.push({
      label: "category flagged",
      value: `${Math.round(input.category.flaggedPct)}%`,
      tone: input.category.flaggedPct > 40 ? "warn" : "neutral",
    });
  }

  // Verdict-driven narrative.
  if (verdict === "BETTER_PRICE_AVAILABLE" && diffPct != null) {
    const saving = potentialSaving ?? (unitPrice != null && bestOnlinePrice != null ? (unitPrice - bestOnlinePrice) * quantity : 0);
    return {
      severity: "bad",
      headline: `${diffPct.toFixed(0)}% above market`,
      detail: `The vendor quote is ${pct(diffPct)} versus the best online price${
        input.bestOnlineSource ? ` (${input.bestOnlineSource})` : ""
      }. Across the order that's ${inrShort(saving)} more than necessary.`,
      recommendation: "Renegotiate or approve against a cheaper listing before clearing.",
      confidence,
      metrics,
    };
  }

  if (verdict === "BETTER_THAN_ONLINE") {
    return {
      severity: "good",
      headline: "Below market price",
      detail: `The vendor quote beats every comparable online listing found${
        prices.length ? ` (lowest online ${inrShort(prices[0])})` : ""
      }. This is a strong deal.`,
      recommendation: "Safe to approve.",
      confidence,
      metrics,
    };
  }

  if (verdict === "GOOD_PRICE") {
    return {
      severity: "good",
      headline: "Fair price",
      detail: `The quote sits within tolerance of the best online price${
        diffPct != null ? ` (${pct(diffPct)})` : ""
      }. No overpayment detected.`,
      recommendation: "Reasonable to approve.",
      confidence,
      metrics,
    };
  }

  if (verdict === "NEEDS_REVIEW") {
    return {
      severity: "warn",
      headline: "No reliable benchmark",
      detail:
        "No comparable online listing was found, so the price can't be auto-verified. Consider adding a reference price or checking again.",
      recommendation: "Verify manually before deciding.",
      confidence: Math.min(confidence, 45),
      metrics,
    };
  }

  return {
    severity: "neutral",
    headline: "Not yet analysed",
    detail: "Run an online price check to let the analyser benchmark this purchase.",
    recommendation: "Check online price.",
    confidence: 15,
    metrics,
  };
}

/** Compact INR like ₹1.2L / ₹3,400 for tight insight badges. */
export function inrShort(value: number | null | undefined): string {
  if (value == null || !isFinite(value)) return "—";
  const abs = Math.abs(value);
  if (abs >= 1e7) return `₹${(value / 1e7).toFixed(2)}Cr`;
  if (abs >= 1e5) return `₹${(value / 1e5).toFixed(2)}L`;
  if (abs >= 1e3) return `₹${(value / 1e3).toFixed(1)}K`;
  return `₹${Math.round(value)}`;
}
