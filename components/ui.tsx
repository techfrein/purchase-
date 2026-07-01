import Link from "next/link";
import type { ReactNode } from "react";
import { IconExternal } from "./icons";

export const inputClass = "input";

export type Tone = "blue" | "amber" | "emerald" | "violet" | "rose" | "sky" | "orange";

const TONE_ICON: Record<Tone, string> = {
  blue: "tone-icon-blue",
  amber: "tone-icon-amber",
  emerald: "tone-icon-emerald",
  violet: "tone-icon-violet",
  rose: "tone-icon-rose",
  sky: "tone-icon-sky",
  orange: "tone-icon-orange",
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

const STAT_TINT: Record<string, string> = {
  blue: "stat-tint-blue",
  amber: "stat-tint-amber",
  green: "stat-tint-green",
  red: "stat-tint-red",
  violet: "stat-tint-violet",
  slate: "stat-tint-slate",
};

export function toneAt(index: number): Tone {
  const tones: Tone[] = ["blue", "amber", "emerald", "violet", "rose", "sky", "orange"];
  return tones[index % tones.length];
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-[var(--foreground)] sm:text-4xl">
          {title}
        </h1>
        {description && <p className="mt-2 text-base text-[var(--stone-600)]">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function Card({
  children,
  className = "",
  elevated = false,
}: {
  children: ReactNode;
  className?: string;
  elevated?: boolean;
}) {
  return <div className={`${elevated ? "card-elevated" : "card"} ${className}`}>{children}</div>;
}

export function CardHeader({
  title,
  subtitle,
  action,
  icon,
  className = "",
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex items-center justify-between gap-3 border-b border-[var(--line)] px-5 py-4 ${className}`}>
      <div className="flex items-center gap-3">
        {icon && (
          <span className="tone-icon-blue flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--line)]">
            {icon}
          </span>
        )}
        <div>
          <h2 className="text-base font-bold tracking-tight text-slate-900">{title}</h2>
          {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

export function IconButton({
  children,
  href,
  className = "",
  ...props
}: {
  children: ReactNode;
  href?: string;
  className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const cls = `icon-btn ${className}`;
  if (href) {
    return (
      <Link href={href} className={cls} aria-label={props["aria-label"]}>
        {children}
      </Link>
    );
  }
  return (
    <button className={cls} {...props}>
      {children}
    </button>
  );
}

export function StatCard({
  label,
  value,
  icon,
  accent = "blue",
  featured = false,
  href,
  caption,
}: {
  label: string;
  value: string;
  icon: ReactNode;
  accent?: "blue" | "amber" | "green" | "red" | "slate" | "violet";
  featured?: boolean;
  href?: string;
  caption?: ReactNode;
}) {
  const accents = {
    blue: "border-[var(--line)] tone-icon-blue",
    amber: "border-[var(--line)] tone-icon-amber",
    green: "border-[var(--line)] tone-icon-emerald",
    red: "border-[var(--line)] chip-brick",
    slate: "border-[var(--line)] chip-neutral",
    violet: "border-[var(--line)] tone-icon-violet",
  };
  const valueColors = {
    blue: "accent-teal",
    amber: "accent-honey",
    green: "accent-sage",
    red: "text-[var(--brick-800)]",
    slate: "text-[var(--foreground)]",
    violet: "accent-plum",
  };

  const corner =
    href != null ? (
      <Link
        href={href}
        aria-label={`Open ${label}`}
        className="icon-btn !h-8 !w-8"
      >
        <IconExternal className="h-3.5 w-3.5" />
      </Link>
    ) : null;

  if (featured) {
    return (
      <div className="stat-card-hero">
        <div className="flex items-start justify-between">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/30 bg-white/20 text-white">
            {icon}
          </span>
          {corner}
        </div>
        <div className="mt-4 text-3xl font-bold leading-none">{value}</div>
        <div className="mt-2 text-sm font-medium text-white/85">{label}</div>
        {caption && <div className="mt-3 text-xs font-medium text-white/70">{caption}</div>}
      </div>
    );
  }

  return (
    <div className={`stat-card ${STAT_TINT[accent] ?? ""}`}>
      <div className="flex items-start justify-between">
        <span className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border ${accents[accent]}`}>
          {icon}
        </span>
        {corner}
      </div>
      <div className={`mt-4 text-3xl font-bold leading-none tracking-tight ${valueColors[accent]}`}>{value}</div>
      <div className="mt-2 text-sm font-medium text-slate-500">{label}</div>
      {caption && <div className="mt-3 text-xs font-medium text-slate-400">{caption}</div>}
    </div>
  );
}

type ButtonVariant = "primary" | "secondary" | "dark" | "success" | "danger" | "ghost";

export function Button({
  children,
  variant = "primary",
  size = "md",
  className = "",
  href,
  ...props
}: {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: "sm" | "md";
  className?: string;
  href?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const variants: Record<ButtonVariant, string> = {
    primary: "btn btn-primary",
    secondary: "btn btn-secondary",
    dark: "btn btn-dark",
    success: "btn btn-success",
    danger: "btn btn-danger",
    ghost: "btn btn-ghost",
  };
  const cls = `${variants[variant]} ${size === "sm" ? "btn-sm" : ""} ${className}`;

  if (href) {
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  }

  return (
    <button className={cls} {...props}>
      {children}
    </button>
  );
}

export function AlertBanner({
  children,
  variant = "info",
}: {
  children: ReactNode;
  variant?: "info" | "success" | "warning" | "error";
}) {
  const styles = {
    info: "border border-[var(--line)] sev-neutral sev-text-neutral",
    success: "border border-[var(--line)] sev-good sev-text-good",
    warning: "border border-[var(--line)] sev-warn sev-text-warn",
    error: "border border-[var(--line)] sev-bad sev-text-bad",
  };
  return (
    <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${styles[variant]}`}>
      {children}
    </div>
  );
}

export function EmptyState({
  message,
  icon,
  action,
}: {
  message: string;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-5 py-14 text-center">
      {icon && (
        <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--line)] bg-slate-50 text-slate-400">
          {icon}
        </span>
      )}
      <p className="text-base text-slate-500">{message}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h2 className="text-sm font-bold tracking-tight text-slate-900">{title}</h2>
      <div className="mt-3">{children}</div>
    </div>
  );
}

export function FilterBar({ children }: { children: ReactNode }) {
  return (
    <div className="mb-6 rounded-3xl border border-[var(--line)] bg-white p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:gap-4">
        {children}
      </div>
    </div>
  );
}

export function FilterField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="section-label block w-full sm:w-auto">
      {label}
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

export function DataTable({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`panel overflow-hidden ${className}`}>
      <div className="overflow-x-auto">
        <table className="table-modern w-full text-sm">{children}</table>
      </div>
    </div>
  );
}

/** Exact same container as dashboard Recent Activity */
export function ActivityList({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`divide-line overflow-hidden rounded-3xl border border-[var(--line)] bg-white divide-y ${className}`}>
      {children}
    </div>
  );
}

/** Exact same row as dashboard Recent Activity */
export function ActivityRow({
  href,
  icon,
  title,
  subtitle,
  meta,
  trailing,
  tone = "blue",
  className = "",
}: {
  href?: string;
  icon: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  meta?: ReactNode;
  trailing?: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  const content = (
    <>
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[var(--line)] text-xl ${TONE_ICON[tone]}`}>
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-base font-semibold text-slate-900">{title}</div>
        {subtitle != null && subtitle !== "" && (
          <div className="truncate text-sm text-slate-400">{subtitle}</div>
        )}
      </div>
      {meta != null && meta !== "" && (
        <div className="hidden shrink-0 text-sm text-slate-400 sm:block">{meta}</div>
      )}
      {trailing}
      {href && <span className={`shrink-0 font-semibold ${TONE_TEXT[tone]}`}>→</span>}
    </>
  );

  const cls = `flex items-center gap-4 px-5 py-4 transition ${TONE_ROW[tone]} ${className}`;
  if (href) {
    return (
      <Link href={href} className={cls}>
        {content}
      </Link>
    );
  }
  return <div className={cls}>{content}</div>;
}

/** @deprecated use ActivityList */
export const ListPanel = ActivityList;

/** @deprecated use ActivityRow */
export function ListRow({
  children,
  href,
  className = "",
}: {
  children: ReactNode;
  href?: string;
  className?: string;
}) {
  const cls = `flex items-center gap-4 px-5 py-4 transition hover:bg-slate-50 ${className}`;
  if (href) {
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  }
  return <div className={cls}>{children}</div>;
}

export function TabBar({ children }: { children: ReactNode }) {
  return <div className="tab-bar mb-6">{children}</div>;
}

export function TabLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={`tab-item ${active ? "tab-item-active" : ""}`}>
      {children}
    </Link>
  );
}