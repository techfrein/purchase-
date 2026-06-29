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
  { href: "/vegetables", label: "Vegetables", icon: <span className="text-lg">🥕</span> },
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
        className={`group relative flex items-center gap-3 rounded-2xl py-2.5 pl-4 pr-3 text-sm font-medium transition-all ${
          isCurrent
            ? "bg-primary-light text-primary shadow-sm"
            : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
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
      <div className="px-5 py-6 border-b border-slate-100">
        <HospitalLogo variant="compact" />
        <div className="mt-1.5 text-[0.65rem] font-semibold uppercase tracking-[1.5px] text-slate-400">
          Purchase Portal
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        <div className="mb-2 px-3 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-slate-400">
          Menu
        </div>
        {MAIN_NAV.map(renderItem)}
        {isAdmin && (
          <>
            <div className="mb-2 mt-5 px-3 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-slate-400">
              Admin
            </div>
            {ADMIN_NAV.map(renderItem)}
          </>
        )}
      </nav>

      {/* Promo card */}
      <div className="px-4 pb-4">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-primary-dark p-5 text-white">
          <div className="absolute -right-5 -top-5 h-16 w-16 rounded-full bg-white/10" />
          <div className="absolute -bottom-6 -left-3 h-14 w-14 rounded-full bg-white/5" />
          <div className="relative">
            <div className="font-semibold leading-tight">Bulk import purchases</div>
            <p className="mt-1 text-xs text-white/80">Upload Excel to add many at once.</p>
            <Link
              href="/import"
              onClick={() => setOpen(false)}
              className="mt-3 inline-flex items-center gap-1.5 rounded-2xl bg-white px-3 py-1 text-xs font-semibold text-primary transition hover:bg-white/90"
            >
              <IconDownload className="h-3.5 w-3.5" />
              Import
            </Link>
          </div>
        </div>
      </div>

      {/* User + logout */}
      <div className="border-t border-slate-100 p-4">
        <div className="flex items-center gap-3 rounded-2xl px-2 py-2 hover:bg-slate-50 transition">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-light text-xs font-bold text-primary">
            {initials(user.name)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-slate-900">{user.name}</div>
            <div className="truncate text-xs text-slate-500">{ROLE_LABELS[user.role] ?? user.role}</div>
          </div>
          <button
            onClick={handleLogout}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
            aria-label="Sign out"
            title="Sign out"
          >
            <IconLogout className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-slate-100 bg-white px-4 py-3 lg:hidden">
        <button
          onClick={() => setOpen(true)}
          className="shrink-0 rounded-2xl p-2 text-slate-500 hover:bg-slate-100 active:bg-slate-200 transition"
          aria-label="Open menu"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        </button>
        <HospitalLogo variant="bar" className="min-w-0 flex-1" />
      </header>

      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen shrink-0 border-r border-slate-100 lg:block lg:h-auto">
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
