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
    <header className="sticky top-0 z-20 hidden items-center gap-4 border-b border-[#eef1ef] bg-white/85 px-6 py-3.5 backdrop-blur lg:flex">
      <form method="GET" action="/purchases" className="search max-w-md flex-1">
        <IconSearch className="h-4 w-4 shrink-0 text-slate-400" />
        <input name="q" type="text" placeholder="Search purchases, vendors, ref no…" aria-label="Search" />
        <kbd className="hidden rounded-md bg-white px-1.5 py-0.5 text-[0.65rem] font-medium text-slate-400 shadow-sm sm:block">
          ⌘ F
        </kbd>
      </form>

      <div className="ml-auto flex items-center gap-2">
        <button type="button" className="icon-btn" aria-label="Messages">
          <IconMail className="h-[1.05rem] w-[1.05rem]" />
        </button>
        <button type="button" className="relative icon-btn" aria-label="Notifications">
          <IconBell className="h-[1.05rem] w-[1.05rem]" />
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-primary ring-2 ring-white" />
        </button>

        <div className="ml-1 flex items-center gap-3 rounded-full py-1 pl-1 pr-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-light text-xs font-bold text-primary-deep">
            {initials(user.name)}
          </span>
          <div className="min-w-0 leading-tight">
            <div className="truncate text-sm font-semibold text-slate-900">{user.name}</div>
            <div className="truncate text-xs text-slate-400">
              {ROLE_LABELS[user.role] ?? user.role}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
