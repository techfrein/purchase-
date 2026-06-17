import Link from "next/link";
import type { ReactNode } from "react";
import { IconExternal } from "./icons";

export const inputClass = "input";

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
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-[1.7rem]">{title}</h1>
        {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
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
    <div className={`flex items-center justify-between gap-3 px-5 py-4 ${className}`}>
      <div className="flex items-center gap-3">
        {icon && (
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-light text-primary">
            {icon}
          </span>
        )}
        <div>
          <h2 className="text-[0.95rem] font-bold text-slate-900">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

/** Small circular icon button (the ↗ on cards, header actions). */
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
  /** Filled green "hero" card, like the lead stat in the dashboard design. */
  featured?: boolean;
  /** When set, the corner ↗ button links here. */
  href?: string;
  /** Small caption under the value, e.g. "Increased from last month". */
  caption?: ReactNode;
}) {
  const accents = {
    blue: "bg-sky-50 text-sky-600",
    amber: "bg-amber-50 text-amber-600",
    green: "bg-emerald-50 text-emerald-600",
    red: "bg-red-50 text-red-600",
    slate: "bg-slate-100 text-slate-600",
    violet: "bg-violet-50 text-violet-600",
  };
  const valueColors = {
    blue: "text-slate-900",
    amber: "text-amber-700",
    green: "text-emerald-700",
    red: "text-red-700",
    slate: "text-slate-900",
    violet: "text-violet-700",
  };

  const corner =
    href != null ? (
      <Link
        href={href}
        aria-label={`Open ${label}`}
        className={
          featured
            ? "flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25"
            : "flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
        }
      >
        <IconExternal className="h-3.5 w-3.5" />
      </Link>
    ) : null;

  if (featured) {
    return (
      <div className="stat-card-hero">
        <div className="flex items-start justify-between">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 text-white">
            {icon}
          </span>
          {corner}
        </div>
        <div className="mt-4 text-3xl font-bold leading-none">{value}</div>
        <div className="mt-2 text-[0.8rem] font-medium text-white/85">{label}</div>
        {caption && <div className="mt-3 text-xs font-medium text-white/75">{caption}</div>}
      </div>
    );
  }

  return (
    <div className="stat-card">
      <div className="flex items-start justify-between">
        <span className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${accents[accent]}`}>
          {icon}
        </span>
        {corner}
      </div>
      <div className={`mt-4 text-3xl font-bold leading-none ${valueColors[accent]}`}>{value}</div>
      <div className="mt-2 text-[0.8rem] font-medium text-slate-500">{label}</div>
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
    ghost: "btn text-slate-600 hover:bg-slate-100",
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
    info: "bg-primary-light text-emerald-900",
    success: "bg-emerald-50 text-emerald-800",
    warning: "bg-amber-50 text-amber-800",
    error: "bg-red-50 text-red-800",
  };
  return (
    <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${styles[variant]}`}>
      {children}
    </div>
  );
}

export function EmptyState({ message, icon }: { message: string; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-5 py-12 text-center">
      {icon && (
        <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
          {icon}
        </span>
      )}
      <p className="text-sm text-slate-500">{message}</p>
    </div>
  );
}

export function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h2 className="text-sm font-bold text-slate-900">{title}</h2>
      <div className="mt-3">{children}</div>
    </div>
  );
}

export function FilterBar({ children }: { children: ReactNode }) {
  return (
    <Card className="mb-5 p-4">
      {/* Stacks full-width on mobile, flows inline from sm up. */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:gap-4">
        {children}
      </div>
    </Card>
  );
}

export function FilterField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block w-full text-xs font-semibold uppercase tracking-wide text-slate-400 sm:w-auto">
      {label}
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

export function DataTable({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <Card className={`overflow-hidden ${className}`}>
      <div className="overflow-x-auto">
        <table className="table-modern w-full text-sm">{children}</table>
      </div>
    </Card>
  );
}
