import Sidebar from "@/components/Sidebar";
import TopHeader from "@/components/TopHeader";
import { isAdminLike, requireUser } from "@/lib/auth";
import { pendingApprovalsCount } from "@/lib/queries";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const pendingApprovals = isAdminLike(user.role) ? await pendingApprovalsCount() : 0;

  return (
    <div className="app-canvas min-h-screen p-3 sm:p-4 lg:p-6">
      <div className="app-shell flex flex-col lg:flex-row">
        <Sidebar
          user={{ name: user.name, role: user.role }}
          pendingApprovals={pendingApprovals}
        />
        <div className="flex min-w-0 flex-1 flex-col border-l border-[var(--line)]">
          <TopHeader user={{ name: user.name, role: user.role, username: user.username }} />
          <main className="app-main min-w-0 flex-1 border-t border-[var(--line)] px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
            <div className="mx-auto w-full max-w-[78rem]">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}