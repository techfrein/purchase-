import { ROLE_LABELS } from "@/lib/format";
import { IconBell, IconMail, IconSearch } from "./icons";

function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

/**
 * Top bar matching the dashboard reference: a rounded search field on the
 * left, then mail / notification icon-buttons and a user chip on the right.
 * The search submits to the purchases list so it does real work.
 */
export default function TopHeader({
  user,
}: {
  user: { name: string; role: string; username: string };
}) {
  return (
    <header className="sticky top-0 z-20 hidden items-center gap-3 border-b border-slate-100 bg-white/95 px-6 py-3.5 backdrop-blur-xl lg:flex">
      <form method="GET" action="/purchases" className="search flex-1 max-w-md">
        <IconSearch className="h-4 w-4 shrink-0 text-slate-400" />
        <input 
          name="q" 
          type="text" 
          placeholder="Search requests, vendors, ref no…" 
          aria-label="Search" 
          className="bg-transparent border-none outline-none flex-1 text-sm placeholder:text-slate-400" 
        />
        <kbd className="hidden rounded-lg bg-slate-100 px-1.5 py-0.5 text-[0.6rem] font-medium text-slate-400 sm:block">
          ⌘K
        </kbd>
      </form>

      <div className="ml-auto flex items-center gap-1.5">
        <button 
          type="button" 
          className="h-9 w-9 flex items-center justify-center rounded-2xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 active:bg-slate-200 transition"
          aria-label="Messages"
        >
          <IconMail className="h-4 w-4" />
        </button>
        <button 
          type="button" 
          className="h-9 w-9 flex items-center justify-center rounded-2xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 active:bg-slate-200 transition relative" 
          aria-label="Notifications"
        >
          <IconBell className="h-4 w-4" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary ring-2 ring-white" />
        </button>

        <div className="ml-2 flex items-center gap-3 rounded-2xl bg-white border border-slate-100 pl-1.5 pr-4 py-1.5 hover:border-slate-200 transition">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary-light text-xs font-bold text-primary">
            {initials(user.name)}
          </span>
          <div className="min-w-0 leading-tight">
            <div className="truncate text-sm font-semibold text-slate-900">{user.name}</div>
            <div className="truncate text-[10px] text-slate-500 -mt-0.5">
              {ROLE_LABELS[user.role] ?? user.role}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
