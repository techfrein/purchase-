import { getSetting } from "./db";

/**
 * Provider-agnostic web-scraping layer.
 *
 * Plain `fetch` cannot reliably read modern B2B sites (IndiaMART, TradeIndia,
 * IndustryBuying): they render prices client-side and block datacentre IPs, so
 * a raw request returns an empty JS shell. For a sellable product we route those
 * fetches through a managed scraping API that renders JS and rotates proxies.
 *
 * Two providers are supported out of the box — ScrapingBee and Browserless —
 * selected by which key is configured. When no provider is configured we fall
 * back to a plain fetch (best-effort, mostly for static pages), so the app keeps
 * working in dev without a paid key.
 *
 * Keys (env wins over the admin settings table, same convention as serper/gemini):
 *   SCRAPINGBEE_API_KEY   → ScrapingBee  (https://www.scrapingbee.com)
 *   BROWSERLESS_API_KEY   → Browserless  (https://www.browserless.io)
 *   SCRAPE_PROVIDER       → "scrapingbee" | "browserless" | "none" (optional override)
 */

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

export type ScrapeProvider = "scrapingbee" | "browserless" | "none";

type ProviderConfig = { provider: ScrapeProvider; key: string };

async function resolveProvider(): Promise<ProviderConfig> {
  // Explicit override (env or setting) takes precedence.
  const override = (
    process.env.SCRAPE_PROVIDER?.trim() ||
    (await getSetting("scrape_provider"))
  ).toLowerCase() as ScrapeProvider | "";

  const beeKey = process.env.SCRAPINGBEE_API_KEY?.trim() || (await getSetting("scrapingbee_key")).trim();
  const browserlessKey =
    process.env.BROWSERLESS_API_KEY?.trim() || (await getSetting("browserless_key")).trim();

  if (override === "scrapingbee" && beeKey) return { provider: "scrapingbee", key: beeKey };
  if (override === "browserless" && browserlessKey) return { provider: "browserless", key: browserlessKey };
  if (override === "none") return { provider: "none", key: "" };

  // Auto-detect: prefer whichever key is present.
  if (beeKey) return { provider: "scrapingbee", key: beeKey };
  if (browserlessKey) return { provider: "browserless", key: browserlessKey };
  return { provider: "none", key: "" };
}

export async function isScrapingConfigured(): Promise<boolean> {
  return (await resolveProvider()).provider !== "none";
}

/**
 * Fetch a URL's rendered HTML. Uses the configured managed scraping API (with
 * JS rendering + proxy) when available, else a plain fetch. Returns null on any
 * failure so callers degrade gracefully — never throws.
 *
 * @param renderJs  whether to wait for client-side rendering (costs more credits)
 */
export async function fetchPage(
  url: string,
  opts: { renderJs?: boolean; timeoutMs?: number } = {}
): Promise<string | null> {
  const { renderJs = true, timeoutMs = 20000 } = opts;
  const cfg = await resolveProvider();

  try {
    if (cfg.provider === "scrapingbee") {
      return await viaScrapingBee(cfg.key, url, renderJs, timeoutMs);
    }
    if (cfg.provider === "browserless") {
      return await viaBrowserless(cfg.key, url, renderJs, timeoutMs);
    }
    return await viaPlainFetch(url, timeoutMs);
  } catch (e) {
    console.warn(`[scrape:${cfg.provider}] failed for ${hostOf(url)}`, e);
    return null;
  }
}

async function viaScrapingBee(
  key: string,
  url: string,
  renderJs: boolean,
  timeoutMs: number
): Promise<string | null> {
  const params = new URLSearchParams({
    api_key: key,
    url,
    render_js: renderJs ? "true" : "false",
    country_code: "in",
    // Block heavy assets we never parse — cheaper + faster.
    block_resources: "true",
  });
  const res = await fetch(`https://app.scrapingbee.com/api/v1/?${params.toString()}`, {
    signal: AbortSignal.timeout(timeoutMs),
    cache: "no-store",
  });
  if (!res.ok) {
    console.warn(`[scrape:scrapingbee] HTTP ${res.status} for ${hostOf(url)}`);
    return null;
  }
  return await res.text();
}

async function viaBrowserless(
  key: string,
  url: string,
  renderJs: boolean,
  timeoutMs: number
): Promise<string | null> {
  // Browserless /content returns the fully rendered HTML of the page.
  const res = await fetch(`https://chrome.browserless.io/content?token=${encodeURIComponent(key)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url,
      gotoOptions: { waitUntil: renderJs ? "networkidle2" : "domcontentloaded", timeout: timeoutMs },
    }),
    signal: AbortSignal.timeout(timeoutMs),
    cache: "no-store",
  });
  if (!res.ok) {
    console.warn(`[scrape:browserless] HTTP ${res.status} for ${hostOf(url)}`);
    return null;
  }
  return await res.text();
}

async function viaPlainFetch(url: string, timeoutMs: number): Promise<string | null> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": UA,
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "en-IN,en;q=0.9",
    },
    signal: AbortSignal.timeout(Math.min(timeoutMs, 10000)),
    cache: "no-store",
  });
  if (!res.ok) return null;
  return await res.text();
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

// ---------------------------------------------------------------------------
// ToS / robots gating.
//
// Scraping legality is per-site and changes over time. Rather than scrape
// anything we can reach, we keep an explicit allowlist of sites whose listing
// pages we are permitted to read (e.g. via a commercial agreement, public API
// terms, or counsel sign-off). A site NOT on the allowlist is never scraped —
// we rely on Serper's already-indexed results for it instead.
//
// This is intentionally conservative and centralised so legal/compliance can
// review one list. Override per-deployment with SCRAPE_ALLOWLIST (comma list).
// ---------------------------------------------------------------------------

const DEFAULT_SCRAPE_ALLOWLIST = [
  // Public catalog pages that publish list prices and whose ToS permit
  // automated read access for price comparison. Review before extending.
  "industrybuying.com",
];

let allowlistCache: Set<string> | null = null;

function scrapeAllowlist(): Set<string> {
  if (allowlistCache) return allowlistCache;
  const fromEnv = process.env.SCRAPE_ALLOWLIST?.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  allowlistCache = new Set(fromEnv && fromEnv.length ? fromEnv : DEFAULT_SCRAPE_ALLOWLIST);
  return allowlistCache;
}

/**
 * Whether we are permitted to directly scrape a given host. Matches the host
 * and its subdomains against the allowlist. Hosts not listed must be sourced
 * via Serper (which reads Google's index), not scraped directly.
 */
export function scrapeAllowed(host: string): boolean {
  const h = host.toLowerCase().replace(/^www\./, "");
  for (const allowed of scrapeAllowlist()) {
    if (h === allowed || h.endsWith(`.${allowed}`)) return true;
  }
  return false;
}
