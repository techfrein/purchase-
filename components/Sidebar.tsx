"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ROLE_LABELS } from "@/lib/format";
import {
  IconChart,
  IconCheck,
  IconClipboard,
  IconDashboard,
  IconLogout,
  IconMedical,
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
  hospitalName,
  pendingApprovals = 0,
}: {
  user: { name: string; role: string };
  hospitalName: string;
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
        className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium ${
          isCurrent
            ? "bg-sky-100 text-sky-800"
            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
        }`}
      >
        <span className={`${isCurrent ? "text-sky-600" : "text-slate-400"}`}>{item.icon}</span>
        <span className="flex-1">{item.label}</span>
        {item.href === "/admin/approvals" && pendingApprovals > 0 && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
            {pendingApprovals}
          </span>
        )}
      </Link>
    );
  }

  const drawer = (
    <div className="flex h-full w-60 flex-col border-r border-sky-100 bg-white">
      <div className="border-b border-sky-100 px-5 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-500 text-white">
            <IconMedical className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold leading-tight text-slate-800">{hospitalName}</div>
            <div className="mt-0.5 text-xs text-slate-500">Purchase Portal</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
        <div className="mb-2 px-3 text-xs font-medium text-slate-400">Menu</div>
        {MAIN_NAV.map(renderItem)}
        {(user.role === "ADMIN" || user.role === "OWNER") && (
          <>
            <div className="mb-2 mt-5 px-3 text-xs font-medium text-slate-400">Admin</div>
            {ADMIN_NAV.map(renderItem)}
          </>
        )}
      </nav>

      <div className="border-t border-sky-100 p-4">
        <div className="flex items-center gap-3 rounded-lg bg-sky-50 px-3 py-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-200 text-xs font-semibold text-sky-800">
            {initials(user.name)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium text-slate-800">{user.name}</div>
            <div className="truncate text-xs text-slate-500">{ROLE_LABELS[user.role] ?? user.role}</div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-sky-100 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
        >
          <IconLogout className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <>
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-sky-100 bg-white px-4 py-3 lg:hidden">
        <button
          onClick={() => setOpen(true)}
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-50"
          aria-label="Open menu"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        </button>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500 text-white">
          <IconMedical className="h-4 w-4" />
        </div>
        <span className="truncate text-sm font-semibold text-slate-800">{hospitalName}</span>
      </header>

      <aside className="sticky top-0 hidden h-screen shrink-0 lg:block">{drawer}</aside>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/20" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 shadow-lg">{drawer}</div>
        </div>
      )}
    </>
  );
}