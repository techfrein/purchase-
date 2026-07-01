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

export default function TopHeader({
  user,
}: {
  user: { name: string; role: string; username: string };
}) {
  return (
    <header className="sticky top-0 z-20 hidden items-center gap-4 border-b border-[var(--line)] bg-white px-6 py-3 lg:flex">
      <form method="GET" action="/purchases" className="search max-w-md flex-1">
        <IconSearch className="h-4 w-4 shrink-0 text-primary" />
        <input
          name="q"
          type="text"
          placeholder="Search requests, vendors, ref no…"
          aria-label="Search"
        />
        <kbd className="badge-teal hidden rounded-md border border-[var(--line)] px-1.5 py-0.5 text-[0.6rem] font-semibold sm:block">
          ⌘K
        </kbd>
      </form>

      <div className="ml-auto flex items-center gap-1.5">
        <button type="button" className="icon-btn tone-icon-sky !h-9 !w-9" aria-label="Messages">
          <IconMail className="h-4 w-4" />
        </button>
        <button type="button" className="icon-btn tone-icon-amber relative !h-9 !w-9" aria-label="Notifications">
          <IconBell className="h-4 w-4" />
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-sm border border-white bg-primary" />
        </button>

        <div className="ml-1 flex items-center gap-3 rounded-xl border border-[var(--line)] bg-white py-1.5 pl-1.5 pr-4">
          <span className="tone-icon-violet flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--line)] text-xs font-bold">
            {initials(user.name)}
          </span>
          <div className="min-w-0 leading-tight">
            <div className="truncate text-sm font-semibold text-slate-900">{user.name}</div>
            <div className="accent-plum -mt-0.5 truncate text-[10px]">
              {ROLE_LABELS[user.role] ?? user.role}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}