import { getSupabase, nextRefNo } from "./db";
import { logAudit } from "./audit";

export type NewPurchase = {
  productName: string;
  category: string;
  brand?: string;
  model?: string;
  specs?: string;
  quantity: number;
  unitPrice?: number | null;
  vendorName?: string;
  vendorContact?: string;
  invoiceNo?: string;
  invoiceDate?: string;
  notes?: string;
  source: "FORM" | "EXCEL";
};

export async function createPurchase(data: NewPurchase, userId: number): Promise<number> {
  const refNo = await nextRefNo();
  const unitPrice =
    data.unitPrice != null && isFinite(data.unitPrice) && data.unitPrice > 0 ? data.unitPrice : null;

  const { data: row, error } = await getSupabase()
    .from("purchases")
    .insert({
      ref_no: refNo,
      product_name: data.productName.trim(),
      category: data.category.trim() || "Other",
      brand: (data.brand ?? "").trim(),
      model: (data.model ?? "").trim(),
      specs: (data.specs ?? "").trim(),
      quantity: Math.max(1, Math.floor(data.quantity)),
      unit_price: unitPrice,
      vendor_name: (data.vendorName ?? "").trim(),
      vendor_contact: (data.vendorContact ?? "").trim(),
      invoice_no: (data.invoiceNo ?? "").trim(),
      invoice_date: (data.invoiceDate ?? "").trim(),
      notes: (data.notes ?? "").trim(),
      source: data.source,
      created_by: userId,
    })
    .select("id")
    .single();

  if (error) throw error;
  const id = row.id as number;
  const priceNote = unitPrice != null ? `@ ₹${unitPrice}` : "no price quoted";
  await logAudit(
    userId,
    "PURCHASE_CREATED",
    "purchase",
    String(id),
    `${refNo}: ${data.productName} (qty ${data.quantity} ${priceNote}, via ${data.source})`
  );
  return id;
}

export function canEnterVendorPricing(role: string): boolean {
  return role !== "STAFF";
}

export function sanitizePurchaseBody(body: Record<string, unknown>, role: string): Record<string, unknown> {
  const out = { ...body };
  if (!canEnterVendorPricing(role)) {
    delete out.unitPrice;
    delete out.vendorName;
    delete out.vendorContact;
    delete out.invoiceNo;
    delete out.invoiceDate;
    return out;
  }
  if (out.unitPrice != null && String(out.unitPrice).trim() === "") {
    delete out.unitPrice;
  }
  return out;
}

export function validatePurchasePayload(body: Record<string, unknown>): string | null {
  if (!String(body.productName ?? "").trim()) return "Product name is required.";
  if (!String(body.category ?? "").trim()) return "Category is required.";
  const qty = Number(body.quantity);
  if (!isFinite(qty) || qty < 1) return "Quantity must be at least 1.";
  if (body.unitPrice != null && String(body.unitPrice).trim() !== "") {
    const price = Number(body.unitPrice);
    if (!isFinite(price) || price <= 0) return "Local vendor price must be a positive number.";
  }
  return null;
}