import { NextResponse } from "next/server";
import { apiUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { parseImportFile } from "@/lib/excel";
import { canEnterVendorPricing, createPurchase } from "@/lib/purchases";
import { runPriceCheck } from "@/lib/pricecheck/engine";

export const maxDuration = 300;

export async function POST(req: Request) {
  const user = await apiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Upload an .xlsx, .xls or .csv file." }, { status: 400 });
  }

  let parsed;
  try {
    parsed = parseImportFile(Buffer.from(await file.arrayBuffer()));
  } catch {
    return NextResponse.json({ error: "Could not read the file. Use the provided template." }, { status: 400 });
  }
  if (parsed.rows.length === 0) {
    return NextResponse.json(
      { error: "No valid rows found.", details: parsed.errors },
      { status: 400 }
    );
  }

  const canQuote = canEnterVendorPricing(user.role);
  const created: Array<{ id: number; productName: string }> = [];
  for (const row of parsed.rows) {
    const id = await createPurchase(
      {
        productName: row.productName,
        category: row.category,
        brand: row.brand,
        model: row.model,
        specs: row.specs,
        quantity: row.quantity,
        unitPrice: canQuote ? row.unitPrice : null,
        vendorName: canQuote ? row.vendorName : "",
        vendorContact: canQuote ? row.vendorContact : "",
        invoiceNo: canQuote ? row.invoiceNo : "",
        invoiceDate: canQuote ? row.invoiceDate : "",
        notes: row.notes,
        source: "EXCEL",
      },
      user.id
    );
    created.push({ id, productName: row.productName });
  }

  const verdicts: Record<number, string> = {};
  const CONCURRENCY = 3;
  for (let i = 0; i < created.length; i += CONCURRENCY) {
    const batch = created.slice(i, i + CONCURRENCY);
    await Promise.allSettled(
      batch.map(async (c) => {
        const r = await runPriceCheck(c.id, user.id);
        verdicts[c.id] = r.verdict;
      })
    );
  }

  await logAudit(user.id, "EXCEL_IMPORT", "purchase", "", `Imported ${created.length} rows from ${file.name}`);

  return NextResponse.json({
    imported: created.length,
    skipped: parsed.errors,
    flagged: Object.values(verdicts).filter((v) => v === "BETTER_PRICE_AVAILABLE").length,
  });
}