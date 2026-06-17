import type { ReactNode } from "react";
import HospitalLogo from "./HospitalLogo";

export default function AuthLayout({
  hospitalName,
  title,
  subtitle,
  children,
  footer,
}: {
  hospitalName: string;
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <main className="flex min-h-screen">
      <div className="auth-panel hidden w-[42%] flex-col justify-between p-10 lg:flex">
        <div>
          <HospitalLogo variant="header" priority />
          <div className="mt-2 text-sm text-slate-500">Purchase Verification Portal</div>
        </div>

        <div className="max-w-sm">
          <h2 className="text-2xl font-semibold leading-snug text-slate-800">
            Keep hospital purchases fair and transparent
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            Check vendor quotes against online prices, flag overpriced items, and keep a clear record
            of every purchase decision.
          </p>
          <ul className="mt-6 space-y-2 text-sm text-slate-600">
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Automatic price verification
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Admin approval workflow
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Excel bulk import
            </li>
          </ul>
        </div>

        <p className="text-xs text-slate-400">
          &copy; {new Date().getFullYear()} {hospitalName}
        </p>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center bg-[var(--background)] px-6 py-10">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <HospitalLogo variant="header" className="mx-auto w-full max-w-xs sm:max-w-sm" priority />
            <p className="mt-4 text-center text-sm text-slate-500">{subtitle}</p>
          </div>

          <div className="mb-6 hidden lg:block">
            <h1 className="text-xl font-semibold text-slate-800">{title}</h1>
            <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
          </div>

          {children}
          {footer}
        </div>
      </div>
    </main>
  );
}