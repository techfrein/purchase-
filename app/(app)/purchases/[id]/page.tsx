import Link from "next/link";
import { notFound } from "next/navigation";
import { MatchBadge, StatusBadge, VerdictBadge } from "@/components/badges";
import { IconArrowLeft, IconExternal } from "@/components/icons";
import { AlertBanner, Card } from "@/components/ui";
import { isAdminLike, requireUser } from "@/lib/auth";
import { formatDate, inr, MATCH_LABELS } from "@/lib/format";
import { canEnterVendorPricing } from "@/lib/purchases";
import { fetchPriceListings, fetchPurchaseById } from "@/lib/queries";
import PurchaseActions from "./PurchaseActions";

const MATCH_ORDER = ["SAME_PRODUCT", "SIMILAR", "SAME_SPEC", "ALTERNATIVE"] as const;

export default async function PurchaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;

  const p = await fetchPurchaseById(Number(id), user);
  if (!p) notFound();

  const listings = await fetchPriceListings(Number(id));

  const showVendorPricing = canEnterVendorPricing(user.role);
  const unitPrice = p.unit_price != null ? Number(p.unit_price) : null;
  const quantity = Number(p.quantity);
  const bestPrice = p.best_online_price != null ? Number(p.best_online_price) : null;
  const verdict = String(p.verdict);
  const diffPct =
    bestPrice != null && unitPrice != null ? ((unitPrice - bestPrice) / bestPrice) * 100 : null;

  const verdictBanner: Record<string, { variant: "error" | "success" | "info" | "warning"; text: string }> = {
    BETTER_PRICE_AVAILABLE: {
      variant: "error",
      text: `This purchase is priced ${diffPct != null ? diffPct.toFixed(1) + "% " : ""}above the best price found online. Potential saving: ${inr(p.potential_saving as number | null)}.`,
    },
    GOOD_PRICE: {
      variant: "success",
      text: "The quoted price is within the acceptable tolerance of the best online price.",
    },
    BETTER_THAN_ONLINE: {
      variant: "info",
      text: "The quoted price is lower than every comparable online listing found.",
    },
    NEEDS_REVIEW: {
      variant: "warning",
      text: "No comparable online listing was found. Verify this price manually or add a reference price to the catalog and re-check.",
    },
    UNCHECKED: {
      variant: "info",
      text: "Price has not been checked yet. Run a price check below.",
    },
  };
  const banner = verdictBanner[verdict] ?? verdictBanner.UNCHECKED;

  const grouped = MATCH_ORDER.map((type) => ({
    type,
    items: listings.filter((l) => l.match_type === type),
  })).filter((g) => g.items.length > 0);

  const details: Array<[string, string]> = [
    ["Category", String(p.category)],
    ["Brand", String(p.brand) || "—"],
    ["Model", String(p.model) || "—"],
    ["Specifications", String(p.specs) || "—"],
    ["Quantity", String(quantity)],
  ];
  if (showVendorPricing) {
    details.push(
      ["Unit Price", inr(unitPrice)],
      ["Vendor", String(p.vendor_name) || "—"],
      ["Vendor Contact", String(p.vendor_contact) || "—"],
      ["Invoice No", String(p.invoice_no) || "—"],
      ["Invoice Date", String(p.invoice_date) || "—"]
    );
  }
  details.push(
    ["Entered By", `${p.created_by_name} · ${formatDate(String(p.created_at))}`],
    ["Source", String(p.source) === "EXCEL" ? "Excel import" : "Manual entry"],
    ["Notes", String(p.notes) || "—"]
  );

  return (
    <div className="max-w-5xl">
      <Link
        href="/purchases"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-sky-700 hover:underline"
      >
        <IconArrowLeft className="h-4 w-4" />
        Back to purchases
      </Link>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{String(p.ref_no)}</h1>
          <p className="mt-1 text-slate-600">{String(p.product_name)}</p>
        </div>
        <div className="flex items-center gap-2">
          <VerdictBadge verdict={verdict} />
          <StatusBadge status={String(p.status)} />
        </div>
      </div>

      <div className="mt-5">
        <AlertBanner variant={banner.variant}>
          {banner.text}
          {p.verdict_basis ? (
            <div className="mt-1.5 text-xs opacity-80">
              {String(p.verdict_basis)}{p.checked_at ? ` · checked ${formatDate(String(p.checked_at))}` : ""}
            </div>
          ) : null}
        </AlertBanner>
      </div>

      <div className={`mt-6 grid gap-6 ${showVendorPricing ? "lg:grid-cols-3" : ""}`}>
        {showVendorPricing && (
          <Card className="p-5 lg:col-span-1">
            <h2 className="text-sm font-semibold text-slate-700">Quoted Purchase</h2>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Unit price</span>
                <span className="font-bold text-slate-900">{inr(unitPrice)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Quantity</span>
                <span className="font-medium text-slate-900">{quantity}</span>
              </div>
              <div className="flex justify-between border-t border-slate-100 pt-2">
                <span className="font-medium text-slate-600">Total</span>
                <span className="text-lg font-bold text-slate-900">
                  {unitPrice != null ? inr(unitPrice * quantity) : "—"}
                </span>
              </div>
            </div>

            <h2 className="mt-6 text-sm font-semibold text-slate-700">Best Online Price</h2>
            {bestPrice != null ? (
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Price</span>
                  <span className="font-bold text-slate-900">{inr(bestPrice)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Source</span>
                  <span className="text-slate-900">{String(p.best_online_source ?? "—")}</span>
                </div>
                {unitPrice != null && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Difference</span>
                    <span className={`font-bold ${unitPrice > bestPrice ? "text-red-600" : "text-green-600"}`}>
                      {diffPct != null ? `${diffPct > 0 ? "+" : ""}${diffPct.toFixed(1)}%` : "—"}
                    </span>
                  </div>
                )}
                {p.best_online_url ? (
                  <a
                    href={String(p.best_online_url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-sky-700 hover:underline"
                  >
                    View listing <IconExternal />
                  </a>
                ) : null}
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-500">No comparable listing found.</p>
            )}
          </Card>
        )}

        <Card className={`p-5 ${showVendorPricing ? "lg:col-span-2" : ""}`}>
          <h2 className="text-xs font-bold uppercase tracking-widest text-sky-700">Purchase Details</h2>
          <dl className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            {details.map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4 border-b border-slate-50 py-2">
                <dt className="text-slate-500">{label}</dt>
                <dd className="text-right font-medium text-slate-900">{value}</dd>
              </div>
            ))}
          </dl>

          {String(p.status) !== "PENDING_REVIEW" && (
            <div className="mt-5 rounded-xl bg-slate-50 px-4 py-3.5 text-sm">
              <span className="font-semibold text-slate-700">
                {String(p.status) === "APPROVED" ? "Approved" : "Rejected"} by {String(p.decided_by_name ?? "—")}
              </span>
              <span className="text-slate-500"> · {formatDate(p.decided_at as string | null)}</span>
              {p.decision_note ? (
                <p className="mt-1.5 text-slate-600">&ldquo;{String(p.decision_note)}&rdquo;</p>
              ) : null}
            </div>
          )}

          <PurchaseActions
            purchaseId={Number(p.id)}
            status={String(p.status)}
            isAdmin={isAdminLike(user.role)}
            checkedAt={p.checked_at as string | null}
          />
        </Card>
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-bold text-slate-900">
          Online Listings Found{" "}
          <span className="text-sm font-normal text-slate-500">({listings.length})</span>
        </h2>
        {grouped.length === 0 ? (
          <Card className="mt-4 p-8 text-center text-sm text-slate-500">
            {p.checked_at ? (
              <>
                <p>Online price check completed but no matching listings were found.</p>
                <p className="mt-2 text-xs">
                  For reliable results across Indian stores, add a Serper.dev API key in{" "}
                  <span className="font-medium text-slate-600">Admin → Settings</span> (or set{" "}
                  <code className="rounded bg-slate-100 px-1">SERPER_API_KEY</code> in{" "}
                  <code className="rounded bg-slate-100 px-1">.env.local</code>), then click
                  Re-check Price below.
                </p>
              </>
            ) : (
              <p>
                No listings yet. Click Check Online Price below to search Google Shopping, Amazon,
                Flipkart, and the internal reference catalog.
              </p>
            )}
          </Card>
        ) : (
          grouped.map((group) => (
            <Card key={group.type} className="mt-4 overflow-hidden">
              <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/50 px-5 py-3">
                <MatchBadge matchType={group.type} />
                <span className="text-xs text-slate-500">
                  {group.items.length} listing(s) · {MATCH_LABELS[group.type]}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="table-modern w-full text-sm">
                  <tbody>
                    {group.items.map((l) => (
                      <tr key={l.id}>
                        <td className="max-w-md">
                          {l.url ? (
                            <a href={l.url} target="_blank" rel="noopener noreferrer" className="font-medium text-sky-700 hover:underline">
                              {l.title}
                            </a>
                          ) : (
                            <span className="text-slate-700">{l.title}</span>
                          )}
                        </td>
                        <td className="text-slate-600">{l.source}</td>
                        <td className="text-right text-xs text-slate-400">
                          match {(Number(l.match_score) * 100).toFixed(0)}%
                        </td>
                        <td className={`text-right font-semibold ${unitPrice != null && Number(l.price) < unitPrice ? "text-red-600" : "text-slate-900"}`}>
                          {inr(Number(l.price))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}