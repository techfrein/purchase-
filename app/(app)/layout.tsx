import Sidebar from "@/components/Sidebar";
import { isAdminLike, requireUser } from "@/lib/auth";
import { getSetting } from "@/lib/db";
import { pendingApprovalsCount } from "@/lib/queries";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const hospitalName = await getSetting("hospital_name");
  const pendingApprovals = isAdminLike(user.role) ? await pendingApprovalsCount() : 0;
  return (
    <div className="lg:flex lg:min-h-screen">
      <Sidebar
        user={{ name: user.name, role: user.role }}
        hospitalName={hospitalName}
        pendingApprovals={pendingApprovals}
      />
      <main className="page-bg min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
        <div className="mx-auto max-w-7xl">{children}</div>
      </main>
    </div>
  );
}