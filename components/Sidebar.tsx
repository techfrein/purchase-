"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ROLE_LABELS } from "@/lib/format";
import HospitalLogo from "./HospitalLogo";
import {
  IconChart,
  IconCheck,
  IconClipboard,
  IconDashboard,
  IconDownload,
  IconLogout,
  IconPlus,
  IconReceipt,
  IconSettings,
  IconTag,
  IconUpload,
  IconUsers,
} from "./icons";

type NavItem = { href: string; label: string; icon: React.ReactNode };

const MAIN_NAV: NavItem[] = [
  { href: "/", label: "Dashboard", icon: <IconDashboard /> },
  { href: "/purchases", label: "Purchases", icon: <IconReceipt /> },
  { href: "/purchases/new", label: "New Request", icon: <IconPlus /> },
  { href: "/import", label: "Excel Import", icon: <IconUpload /> },
  { href: "/reports", label: "Reports", icon: <IconChart /> },
];

const ADMIN_NAV: NavItem[] = [
  { href: "/admin/approvals", label: "Account Approvals", icon: <IconCheck /> },
  { href: "/admin/users", label: "Users", icon: <IconUsers /> },
  { href: "/admin/catalog", label: "Reference Catalog", icon: <IconTag /> },
  { href: "/admin/settings", label: "Settings", icon: <IconSettings /> },
  { href: "/admin/audit", label: "Audit Log", icon: <IconClipboard /> },
];

function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function Sidebar({
  user,
  pendingApprovals = 0,
}: {
  user: { name: string; role: string };
  pendingApprovals?: number;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");

  const active = (href: string) =>
    href === "/purchases"
      ? pathname === "/purchases" || /^\/purchases\/\d+/.test(pathname)
      : isActive(href);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  function renderItem(item: NavItem) {
    const isCurrent = active(item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={() => setOpen(false)}
        className={`group relative flex items-center gap-3 rounded-xl py-2.5 pl-4 pr-3 text-sm font-medium transition ${
          isCurrent
            ? "bg-primary-light text-emerald-900"
            : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
        }`}
      >
        {isCurrent && (
          <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-primary" />
        )}
        <span className={isCurrent ? "text-primary" : "text-slate-400 group-hover:text-slate-500"}>
          {item.icon}
        </span>
        <span className="flex-1">{item.label}</span>
        {item.href === "/admin/approvals" && pendingApprovals > 0 && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[0.65rem] font-bold text-amber-700">
            {pendingApprovals}
          </span>
        )}
      </Link>
    );
  }

  const isAdmin = user.role === "ADMIN" || user.role === "OWNER";

  const drawer = (
    <div className="flex h-full w-64 flex-col bg-white">
      {/* Wordmark */}
      <div className="px-4 py-5">
        <HospitalLogo variant="compact" />
        <div className="mt-1.5 text-[0.7rem] font-medium uppercase tracking-wide text-slate-400">
          Purchase Portal
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
        <div className="mb-1.5 px-4 text-[0.65rem] font-bold uppercase tracking-[0.12em] text-slate-300">
          Menu
        </div>
        {MAIN_NAV.map(renderItem)}
        {isAdmin && (
          <>
            <div className="mb-1.5 mt-6 px-4 text-[0.65rem] font-bold uppercase tracking-[0.12em] text-slate-300">
              Admin
            </div>
            {ADMIN_NAV.map(renderItem)}
          </>
        )}
      </nav>

      {/* Promo card, like the reference's "Download our Mobile App" */}
      <div className="px-4 pb-4">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-primary-deep p-4 text-white">
          <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-white/10" />
          <div className="absolute -bottom-8 -left-4 h-20 w-20 rounded-full bg-white/5" />
          <div className="relative">
            <div className="text-sm font-bold leading-tight">Bulk import purchases</div>
            <p className="mt-1 text-xs text-white/80">Upload an Excel sheet to add many at once.</p>
            <Link
              href="/import"
              onClick={() => setOpen(false)}
              className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-primary-deep transition hover:bg-white/90"
            >
              <IconDownload className="h-3.5 w-3.5" />
              Import
            </Link>
          </div>
        </div>
      </div>

      {/* User + logout */}
      <div className="border-t border-[#eef1ef] p-3">
        <div className="flex items-center gap-3 rounded-xl px-2 py-1.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-light text-xs font-bold text-primary-deep">
            {initials(user.name)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-slate-900">{user.name}</div>
            <div className="truncate text-xs text-slate-400">{ROLE_LABELS[user.role] ?? user.role}</div>
          </div>
          <button
            onClick={handleLogout}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Sign out"
            title="Sign out"
          >
            <IconLogout className="h-[1.05rem] w-[1.05rem]" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile top bar — logo only; name is already in the banner image */}
      <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-[#eef1ef] bg-white px-3 py-2.5 lg:hidden">
        <button
          onClick={() => setOpen(true)}
          className="shrink-0 rounded-lg p-2 text-slate-600 hover:bg-slate-50"
          aria-label="Open menu"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        </button>
        <HospitalLogo variant="bar" className="min-w-0 flex-1" />
      </header>

      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen shrink-0 border-r border-[#eef1ef] lg:block lg:h-auto">
        {drawer}
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 shadow-xl">{drawer}</div>
        </div>
      )}
    </>
  );
}
