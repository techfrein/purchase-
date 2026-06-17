import * as cheerio from "cheerio";
import { getSetting, getSupabase } from "../db";
import { tokenize } from "./classify";
import type { Listing, ProductInput } from "./types";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

function searchQuery(input: ProductInput): string {
  const parts = [input.brand, input.model || input.productName];
  const q = [...new Set(parts.join(" ").split(/\s+/))].join(" ").trim();
  return q || input.productName;
}

function parsePrice(text: string): number | null {
  const m = text.replace(/[,\s]/g, "").match(/(?:₹|rs\.?|inr)?(\d+(?:\.\d{1,2})?)/i);
  if (!m) return null;
  const n = parseFloat(m[1]);
  return isFinite(n) && n > 0 ? n : null;
}

async function fetchText(url: string, timeoutMs = 8000): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": UA,
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-IN,en;q=0.9",
      },
      signal: AbortSignal.timeout(timeoutMs),
      cache: "no-store",
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

async function serperRequest(
  key: string,
  endpoint: "shopping" | "search",
  q: string
): Promise<Listing[]> {
  const res = await fetch(`https://google.serper.dev/${endpoint}`, {
    method: "POST",
    headers: { "X-API-KEY": key, "Content-Type": "application/json" },
    body: JSON.stringify({ q, gl: "in", hl: "en", num: 15 }),
    signal: AbortSignal.timeout(15000),
    cache: "no-store",
  });
  if (!res.ok) return [];
  const data = (await res.json()) as {
    shopping?: Array<{
      title?: string;
      source?: string;
      price?: string;
      priceValue?: number;
      link?: string;
    }>;
    organic?: Array<{ title?: string; link?: string; snippet?: string }>;
  };

  if (endpoint === "shopping") {
    return (data.shopping ?? [])
      .map((r) => {
        const price = r.priceValue ?? (r.price ? parsePrice(r.price) : null);
        if (!r.title || !price) return null;
        return {
          source: r.source ? `${r.source} (Google Shopping)` : "Google Shopping",
          title: r.title,
          price,
          url: r.link ?? null,
        } as Listing;
      })
      .filter((l): l is Listing => l !== null);
  }

  return (data.organic ?? [])
    .map((r) => {
      if (!r.title) return null;
      const price = parsePrice(`${r.title} ${r.snippet ?? ""}`);
      if (!price) return null;
      return {
        source: "Google Search",
        title: r.title,
        price,
        url: r.link ?? null,
      } as Listing;
    })
    .filter((l): l is Listing => l !== null);
}

/** Google Shopping via Serper.dev — the reliable live source when an API key is configured. */
async function serperListings(input: ProductInput): Promise<Listing[]> {
  const key = (await getSetting("serper_key")).trim();
  if (!key) return [];
  const q = searchQuery(input);
  try {
    const shopping = await serperRequest(key, "shopping", q);
    if (shopping.length >= 3) return shopping;
    const search = await serperRequest(key, "search", `${q} price india buy`);
    return [...shopping, ...search];
  } catch {
    return [];
  }
}

async function withRetry(fetcher: () => Promise<Listing[]>, attempts = 2): Promise<Listing[]> {
  for (let i = 0; i < attempts; i++) {
    const result = await fetcher();
    if (result.length > 0) return result;
    if (i < attempts - 1) await new Promise((r) => setTimeout(r, 600));
  }
  return [];
}

/** Best-effort scrape of Amazon.in search results. Amazon frequently blocks bots; failures return []. */
async function amazonListings(input: ProductInput): Promise<Listing[]> {
  const q = searchQuery(input);
  const html = await fetchText(`https://www.amazon.in/s?k=${encodeURIComponent(q)}`);
  if (!html) return [];
  try {
    const $ = cheerio.load(html);
    const out: Listing[] = [];
    $('div[data-component-type="s-search-result"]').each((_, el) => {
      if (out.length >= 12) return;
      const card = $(el);
      const title = card.find("h2 span").first().text().trim();
      const priceText = card.find(".a-price .a-offscreen").first().text().trim();
      const href = card.find("h2 a").attr("href") ?? card.find("a.a-link-normal").attr("href");
      const price = parsePrice(priceText);
      if (title && price) {
        out.push({
          source: "Amazon.in",
          title,
          price,
          url: href ? new URL(href, "https://www.amazon.in").toString() : null,
        });
      }
    });
    return out;
  } catch {
    return [];
  }
}

/** Strips UI chrome and the "4.3123 Ratings&12 Reviews" tails Flipkart cards embed in their text. */
function cleanFlipkartTitle(raw: string): string {
  return raw
    .replace(/^\s*\d+\.\s*/, "")
    .replace(/\b(?:Add to Compare|Currently unavailable|Sponsored|Ad\b)/gi, "")
    .replace(/\d(?:\.\d+)?[\d,]*\s*Ratings?.*$/i, "")
    .replace(/\d+\s*Reviews?.*$/i, "")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, 150);
}

/** Best-effort scrape of Flipkart search results. Selectors change often; failures return []. */
async function flipkartListings(input: ProductInput): Promise<Listing[]> {
  const q = searchQuery(input);
  const html = await fetchText(`https://www.flipkart.com/search?q=${encodeURIComponent(q)}`);
  if (!html) return [];
  try {
    const $ = cheerio.load(html);
    const out: Listing[] = [];
    // Flipkart obfuscates class names; match price-looking nodes and walk up to the card link.
    $("a[href]").each((_, el) => {
      if (out.length >= 12) return;
      const card = $(el);
      const text = card.text();
      if (!text.includes("₹")) return;
      // Indian grouping (₹1,29,990) with a boundary so trailing digits from
      // adjacent DOM text (ratings, review counts) don't get glued on.
      const priceMatch = text.match(/₹\s?\d{1,3}(?:,\d{2,3})*(?![\d,])/);
      if (!priceMatch) return;
      const price = parsePrice(priceMatch[0]);
      const title = cleanFlipkartTitle(
        card.find("[title]").attr("title") ?? text.split("₹")[0]
      );
      if (title && title.length > 10 && price && price > 100) {
        const href = card.attr("href");
        out.push({
          source: "Flipkart",
          title,
          price,
          url: href ? new URL(href, "https://www.flipkart.com").toString() : null,
        });
      }
    });
    return out;
  } catch {
    return [];
  }
}

/** Internal reference catalog maintained by admins — always available, even offline. */
async function catalogListings(input: ProductInput): Promise<Listing[]> {
  if ((await getSetting("catalog_enabled")) !== "1") return [];
  const { data: rows, error } = await getSupabase()
    .from("reference_prices")
    .select("product_name, category, brand, model, price, source, url");
  if (error) throw error;

  const inputTokens = new Set(tokenize(`${input.productName} ${input.brand} ${input.model}`));
  return (rows ?? [])
    .filter((r) => {
      if (r.category.toLowerCase() === input.category.toLowerCase()) return true;
      const refTokens = tokenize(`${r.product_name} ${r.brand} ${r.model}`);
      const hits = refTokens.filter((t) => inputTokens.has(t)).length;
      return hits >= 2;
    })
    .map((r) => ({
      source: r.source || "Internal Catalog",
      // Append the category so the classifier can recognise same-category
      // alternatives (catalog product names rarely contain the category word).
      title: [r.product_name, r.model && !r.product_name.includes(r.model) ? `(${r.model})` : "", `· ${r.category}`]
        .filter(Boolean)
        .join(" "),
      price: r.price,
      url: r.url,
    }));
}

export async function gatherListings(input: ProductInput): Promise<Listing[]> {
  const tasks: Promise<Listing[]>[] = [serperListings(input)];
  if ((await getSetting("scrape_enabled")) === "1") {
    tasks.push(
      withRetry(() => amazonListings(input)),
      withRetry(() => flipkartListings(input))
    );
  }
  const settled = await Promise.allSettled(tasks);
  const live = settled.flatMap((s) => (s.status === "fulfilled" ? s.value : []));
  const all = [...live, ...(await catalogListings(input))];

  // Dedupe by source+title+price
  const seen = new Set<string>();
  return all.filter((l) => {
    const key = `${l.source}|${l.title.toLowerCase()}|${l.price}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
