import { IconDownload } from "@/components/icons";
import { Card, FormSection, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import ImportForm from "./ImportForm";

export default async function ImportPage() {
  await requireUser();
  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Excel Import"
        description="Upload a spreadsheet of purchases. Each row is recorded and price-checked automatically."
      />

      <Card elevated className="p-6 sm:p-8">
        <FormSection title="Step 1 — Download Template">
          <p className="text-sm leading-relaxed text-slate-600">
            Use the standard template so the columns map correctly. Required columns:{" "}
            <strong className="text-slate-800">Product Name</strong> and{" "}
            <strong className="text-slate-800">Quantity</strong>. Unit price and vendor columns are optional.
          </p>
          <a
            href="/api/import/template"
            className="btn btn-secondary mt-4"
          >
            <IconDownload className="h-4 w-4" />
            Download Template (.xlsx)
          </a>
        </FormSection>

        <div className="my-8 border-t border-slate-100" />

        <FormSection title="Step 2 — Upload File">
          <ImportForm />
        </FormSection>
      </Card>
    </div>
  );
}