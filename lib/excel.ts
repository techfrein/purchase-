import * as XLSX from "xlsx";

export type ImportRow = {
  productName: string;
  category: string;
  brand: string;
  model: string;
  specs: string;
  quantity: number;
  unitPrice: number | null;
  vendorName: string;
  vendorContact: string;
  invoiceNo: string;
  invoiceDate: string;
  notes: string;
};

export const TEMPLATE_HEADERS = [
  "Product Name",
  "Category",
  "Brand",
  "Model",
  "Specifications",
  "Quantity",
  "Unit Price (INR)",
  "Vendor Name",
  "Vendor Contact",
  "Invoice No",
  "Invoice Date",
  "Notes",
];

const HEADER_ALIASES: Record<string, keyof ImportRow> = {
  productname: "productName",
  product: "productName",
  item: "productName",
  itemname: "productName",
  category: "category",
  brand: "brand",
  make: "brand",
  model: "model",
  modelno: "model",
  specifications: "specs",
  specs: "specs",
  spec: "specs",
  quantity: "quantity",
  qty: "quantity",
  unitprice: "unitPrice",
  unitpriceinr: "unitPrice",
  price: "unitPrice",
  rate: "unitPrice",
  vendorname: "vendorName",
  vendor: "vendorName",
  supplier: "vendorName",
  vendorcontact: "vendorContact",
  contact: "vendorContact",
  invoiceno: "invoiceNo",
  invoice: "invoiceNo",
  billno: "invoiceNo",
  invoicedate: "invoiceDate",
  billdate: "invoiceDate",
  notes: "notes",
  remarks: "notes",
};

function normalizeHeader(h: string): string {
  return h.toLowerCase().replace(/[^a-z]/g, "");
}

export function parseImportFile(buffer: Buffer): {
  rows: ImportRow[];
  errors: string[];
} {
  const wb = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  if (!ws) return { rows: [], errors: ["The file contains no worksheets."] };

  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });
  const rows: ImportRow[] = [];
  const errors: string[] = [];

  raw.forEach((r, i) => {
    const mapped: Partial<Record<keyof ImportRow, unknown>> = {};
    for (const [key, value] of Object.entries(r)) {
      const field = HEADER_ALIASES[normalizeHeader(key)];
      if (field) mapped[field] = value;
    }
    const line = i + 2; // 1-based + header row

    const productName = String(mapped.productName ?? "").trim();
    const category = String(mapped.category ?? "").trim() || "Other";
    const quantity = Math.floor(Number(mapped.quantity ?? 1)) || 1;
    const priceRaw = String(mapped.unitPrice ?? "").trim().replace(/[₹,\s]/g, "");
    let unitPrice: number | null = null;
    if (priceRaw !== "") {
      const parsed = Number(priceRaw);
      if (!isFinite(parsed) || parsed <= 0) {
        errors.push(`Row ${line} (${productName || "no name"}): invalid unit price — skipped.`);
        return;
      }
      unitPrice = parsed;
    }

    if (!productName) {
      errors.push(`Row ${line}: missing product name — skipped.`);
      return;
    }

    let invoiceDate = "";
    const rawDate = mapped.invoiceDate;
    if (rawDate instanceof Date && !isNaN(rawDate.getTime())) {
      invoiceDate = rawDate.toISOString().slice(0, 10);
    } else if (rawDate) {
      invoiceDate = String(rawDate).trim();
    }

    rows.push({
      productName,
      category,
      brand: String(mapped.brand ?? "").trim(),
      model: String(mapped.model ?? "").trim(),
      specs: String(mapped.specs ?? "").trim(),
      quantity,
      unitPrice,
      vendorName: String(mapped.vendorName ?? "").trim(),
      vendorContact: String(mapped.vendorContact ?? "").trim(),
      invoiceNo: String(mapped.invoiceNo ?? "").trim(),
      invoiceDate,
      notes: String(mapped.notes ?? "").trim(),
    });
  });

  return { rows, errors };
}

export function buildTemplate(): Buffer {
  const sample = [
    TEMPLATE_HEADERS,
    [
      "Samsung 43 inch Crystal 4K UHD Smart TV",
      "Television",
      "Samsung",
      "UA43DUE70",
      "43 inch, 4K UHD, Smart TV",
      2,
      31500,
      "Sharma Electronics",
      "9876543210",
      "INV-2041",
      "2026-06-10",
      "For OPD waiting area",
    ],
  ];
  const ws = XLSX.utils.aoa_to_sheet(sample);
  ws["!cols"] = TEMPLATE_HEADERS.map((h) => ({ wch: Math.max(h.length + 2, 14) }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Purchases");
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

export function buildExport(rows: Array<Record<string, unknown>>): Buffer {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Purchases");
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}
