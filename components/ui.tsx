import Link from "next/link";
import type { ReactNode } from "react";

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
        <h1 className="text-2xl font-semibold text-slate-800">{title}</h1>
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
  className = "",
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex items-center justify-between border-b border-sky-50 px-5 py-3.5 ${className}`}>
      <div>
        <h2 className="text-sm font-semibold text-slate-700">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatCard({
  label,
  value,
  icon,
  accent = "blue",
}: {
  label: string;
  value: string;
  icon: ReactNode;
  accent?: "blue" | "amber" | "green" | "red" | "slate" | "violet";
}) {
  const accents = {
    blue: "bg-sky-50 text-sky-600",
    amber: "bg-amber-50 text-amber-600",
    green: "bg-green-50 text-green-600",
    red: "bg-red-50 text-red-600",
    slate: "bg-slate-100 text-slate-600",
    violet: "bg-violet-50 text-violet-600",
  };
  const valueColors = {
    blue: "text-slate-800",
    amber: "text-amber-700",
    green: "text-green-700",
    red: "text-red-700",
    slate: "text-slate-800",
    violet: "text-violet-700",
  };

  return (
    <div className="stat-card">
      <div className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${accents[accent]}`}>
        {icon}
      </div>
      <div className="mt-3 text-xs font-medium text-slate-500">{label}</div>
      <div className={`mt-1 text-xl font-semibold ${valueColors[accent]}`}>{value}</div>
    </div>
  );
}

export function Button({
  children,
  variant = "primary",
  className = "",
  href,
  ...props
}: {
  children: ReactNode;
  variant?: "primary" | "secondary" | "dark" | "success" | "danger";
  className?: string;
  href?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const variants = {
    primary: "btn btn-primary",
    secondary: "btn btn-secondary",
    dark: "btn btn-dark",
    success: "btn btn-success",
    danger: "btn btn-danger",
  };
  const cls = `${variants[variant]} ${className}`;

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
    info: "border-sky-100 bg-sky-50 text-slate-700",
    success: "border-green-200 bg-green-50 text-green-800",
    warning: "border-amber-200 bg-amber-50 text-amber-800",
    error: "border-red-200 bg-red-50 text-red-800",
  };
  return (
    <div className={`rounded-lg border px-4 py-3 text-sm leading-relaxed ${styles[variant]}`}>
      {children}
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return <p className="px-5 py-10 text-center text-sm text-slate-500">{message}</p>;
}

export function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-slate-700">{title}</h2>
      <div className="mt-3">{children}</div>
    </div>
  );
}

export function FilterBar({ children }: { children: ReactNode }) {
  return (
    <Card className="mb-5 p-4">
      <div className="flex flex-wrap items-end gap-4">{children}</div>
    </Card>
  );
}

export function FilterField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="text-xs font-medium text-slate-500">
      {label}
      <div className="mt-1">{children}</div>
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