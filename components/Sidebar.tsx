"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { Tone } from "@/components/ui";
import { ROLE_LABELS } from "@/lib/format";
import HospitalLogo from "./HospitalLogo";
import {
  IconChart,
  IconCheck,
  IconClipboard,
  IconDashboard,
  IconLogout,
  IconPlus,
  IconReceipt,
  IconSettings,
  IconTag,
  IconUpload,
  IconUsers,
} from "./icons";

type NavItem = { href: string; label: string; icon: React.ReactNode; tone: Tone };

const MAIN_NAV: NavItem[] = [
  { href: "/", label: "Dashboard", icon: <IconDashboard />, tone: "blue" },
  { href: "/purchases", label: "Purchases", icon: <IconReceipt />, tone: "violet" },
  { href: "/purchases/new", label: "New Request", icon: <IconPlus />, tone: "emerald" },
  { href: "/vegetables", label: "Vegetables", icon: <span>🥕</span>, tone: "orange" },
  { href: "/import", label: "Excel Import", icon: <IconUpload />, tone: "sky" },
  { href: "/reports", label: "Reports", icon: <IconChart />, tone: "rose" },
];

const ADMIN_NAV: NavItem[] = [
  { href: "/admin/approvals", label: "Account Approvals", icon: <IconCheck />, tone: "amber" },
  { href: "/admin/users", label: "Users", icon: <IconUsers />, tone: "blue" },
  { href: "/admin/catalog", label: "Reference Catalog", icon: <IconTag />, tone: "violet" },
  { href: "/admin/settings", label: "Settings", icon: <IconSettings />, tone: "emerald" },
  { href: "/admin/audit", label: "Audit Log", icon: <IconClipboard />, tone: "rose" },
];

const TONE_ICON: Record<Tone, string> = {
  blue: "tone-icon-blue",
  amber: "tone-icon-amber",
  emerald: "tone-icon-emerald",
  violet: "tone-icon-violet",
  rose: "tone-icon-rose",
  sky: "tone-icon-sky",
  orange: "tone-icon-orange",
};

const TONE_ACTIVE: Record<Tone, string> = {
  blue: "tone-active-blue",
  amber: "tone-active-amber",
  emerald: "tone-active-emerald",
  violet: "tone-active-violet",
  rose: "tone-active-rose",
  sky: "tone-active-sky",
  orange: "tone-active-orange",
};

const TONE_ROW: Record<Tone, string> = {
  blue: "tone-row-blue",
  amber: "tone-row-amber",
  emerald: "tone-row-emerald",
  violet: "tone-row-violet",
  rose: "tone-row-rose",
  sky: "tone-row-sky",
  orange: "tone-row-orange",
};

const TONE_TEXT: Record<Tone, string> = {
  blue: "tone-text-blue",
  amber: "tone-text-amber",
  emerald: "tone-text-emerald",
  violet: "tone-text-violet",
  rose: "tone-text-rose",
  sky: "tone-text-sky",
  orange: "tone-text-orange",
};

function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function NavLines({
  items,
  active,
  onNavigate,
  pendingApprovals,
}: {
  items: NavItem[];
  active: (href: string) => boolean;
  onNavigate: () => void;
  pendingApprovals: number;
}) {
  return (
    <div className="divide-line divide-y border-y border-[var(--line)]">
      {items.map((item) => {
        const isCurrent = active(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`flex items-center gap-4 px-5 py-3.5 transition ${TONE_ROW[item.tone]} ${
              isCurrent ? TONE_ACTIVE[item.tone] : ""
            }`}
          >
            <span
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[var(--line)] ${TONE_ICON[item.tone]}`}
            >
              {item.icon}
            </span>
            <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-900">
              {item.label}
            </span>
            {item.href === "/admin/approvals" && pendingApprovals > 0 && (
              <span className="badge-honey rounded-md border border-[var(--line)] px-2 py-0.5 text-xs font-bold">
                {pendingApprovals}
              </span>
            )}
            <span className={`font-semibold ${TONE_TEXT[item.tone]}`}>→</span>
          </Link>
        );
      })}
    </div>
  );
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

  const isAdmin = user.role === "ADMIN" || user.role === "OWNER";
  const close = () => setOpen(false);

  const drawer = (
    <div className="flex h-full w-64 flex-col bg-white">
      <div className="border-b border-[var(--line)] bg-white px-5 py-6">
        <HospitalLogo variant="compact" />
        <div className="section-label mt-2">Purchase Portal</div>
      </div>

      <nav className="flex-1 overflow-y-auto">
        <NavLines items={MAIN_NAV} active={active} onNavigate={close} pendingApprovals={0} />
        {isAdmin && (
          <NavLines items={ADMIN_NAV} active={active} onNavigate={close} pendingApprovals={pendingApprovals} />
        )}
      </nav>

      <div className="divide-line divide-y border-t border-[var(--line)]">
        <div className="tone-row-violet flex items-center gap-4 px-5 py-4">
          <span className="tone-icon-violet flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[var(--line)] text-xs font-bold">
            {initials(user.name)}
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-base font-semibold text-slate-900">{user.name}</div>
            <div className="truncate text-sm text-slate-500">{ROLE_LABELS[user.role] ?? user.role}</div>
          </div>
          <button
            onClick={handleLogout}
            className="icon-btn shrink-0"
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
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-[var(--line)] bg-white px-4 py-3 lg:hidden">
        <button onClick={() => setOpen(true)} className="icon-btn shrink-0" aria-label="Open menu">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        </button>
        <HospitalLogo variant="bar" className="min-w-0 flex-1" />
      </header>

      <aside className="sticky top-0 hidden shrink-0 lg:block lg:self-stretch">{drawer}</aside>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/25 backdrop-blur-[1px]" onClick={close} />
          <div className="absolute inset-y-0 left-0 border-r border-[var(--line)]">{drawer}</div>
        </div>
      )}
    </>
  );
}