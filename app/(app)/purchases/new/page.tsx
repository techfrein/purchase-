import { requireUser } from "@/lib/auth";
import PurchaseRequestForm from "./PurchaseForm";

export default async function NewPurchaseRequestPage() {
  const user = await requireUser();

  return (
    <div>
      <PurchaseRequestForm userRole={user.role} />
    </div>
  );
}