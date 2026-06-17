import { apiUser } from "@/lib/auth";
import { buildExport } from "@/lib/excel";
import { STATUS_LABELS, VERDICT_LABELS } from "@/lib/format";
import { fetchPurchasesForExport } from "@/lib/queries";

export async function GET(req: Request) {
  const user = await apiUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const verdict = url.searchParams.get("verdict");
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  const filters: { status?: string; verdict?: string; from?: string; to?: string } = {};
  if (status) filters.status = status;
  if (verdict) filters.verdict = verdict;
  if (from) filters.from = from;
  if (to) filters.to = to;

  const rows = await fetchPurchasesForExport(filters);

  const exportRows = rows.map((p) => ({
    "Ref No": p.ref_no,
    "Product": p.product_name,
    "Category": p.category,
    "Brand": p.brand,
    "Model": p.model,
    "Qty": p.quantity,
    "Unit Price (INR)": p.unit_price,
    "Total (INR)": Number(p.unit_price) * Number(p.quantity),
    "Vendor": p.vendor_name,
    "Invoice No": p.invoice_no,
    "Invoice Date": p.invoice_date,
    "Verdict": VERDICT_LABELS[String(p.verdict)] ?? p.verdict,
    "Best Online Price (INR)": p.best_online_price ?? "",
    "Best Online Source": p.best_online_source ?? "",
    "Potential Saving (INR)": p.potential_saving ?? "",
    "Status": STATUS_LABELS[String(p.status)] ?? p.status,
    "Entered By": p.created_by_name,
    "Entered At": p.created_at,
    "Decided By": p.decided_by_name ?? "",
    "Decision Note": p.decision_note,
  }));

  const buffer = buildExport(exportRows);
  const date = new Date().toISOString().slice(0, 10);
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="purchase-report-${date}.xlsx"`,
    },
  });
}