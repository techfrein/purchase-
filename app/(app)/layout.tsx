import Sidebar from "@/components/Sidebar";
import TopHeader from "@/components/TopHeader";
import { isAdminLike, requireUser } from "@/lib/auth";
import { pendingApprovalsCount } from "@/lib/queries";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const pendingApprovals = isAdminLike(user.role) ? await pendingApprovalsCount() : 0;

  return (
    <div className="min-h-screen bg-canvas p-0 lg:p-4">
      {/*
        Mobile: a plain vertical stack (mobile header from Sidebar, then content).
        Desktop (lg+): the floating rounded panel with the sidebar in a row.
        flex-direction is column on mobile and only becomes row at lg, otherwise
        the mobile header and content would sit side-by-side.
      */}
      <div className="app-shell flex min-h-screen flex-col lg:min-h-[calc(100vh-2rem)] lg:flex-row">
        <Sidebar
          user={{ name: user.name, role: user.role }}
          pendingApprovals={pendingApprovals}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <TopHeader user={{ name: user.name, role: user.role, username: user.username }} />
          <main className="min-w-0 flex-1 px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
            <div className="mx-auto w-full max-w-[78rem]">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
