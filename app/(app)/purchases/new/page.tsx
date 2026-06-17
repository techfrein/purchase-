import { PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { fetchCategories } from "@/lib/categories";
import { canEnterVendorPricing } from "@/lib/purchases";
import PurchaseForm from "./PurchaseForm";

export default async function NewPurchasePage() {
  const user = await requireUser();
  const [canQuoteVendor, categories] = await Promise.all([
    Promise.resolve(canEnterVendorPricing(user.role)),
    fetchCategories(),
  ]);

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="New Purchase Request"
        description={
          canQuoteVendor
            ? "Enter product details. Vendor price and invoice fields are optional — leave them blank if not available yet."
            : "Enter what you need ordered. Your request goes to the purchase department — you don't need to enter vendor pricing."
        }
      />
      <PurchaseForm canQuoteVendor={canQuoteVendor} categories={categories} />
    </div>
  );
}