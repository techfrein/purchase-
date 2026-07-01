import type { ReactNode } from "react";
import HospitalLogo from "./HospitalLogo";

export default function AuthLayout({
  hospitalName,
  children,
  footer,
  leftImage,
}: {
  hospitalName: string;
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
  leftImage?: string;
}) {
  return (
    <main className="app-canvas min-h-screen p-3 sm:p-4 lg:p-6">
      <div className="app-shell flex flex-col lg:flex-row">
        {leftImage ? (
          <div
            className="relative hidden w-full border-b border-[var(--line)] bg-cover bg-center lg:block lg:w-[38%] lg:border-b-0 lg:border-r"
            style={{ backgroundImage: `url(${leftImage})` }}
          />
        ) : (
          <div className="hidden w-full flex-col justify-between border-b border-[var(--line)] bg-white p-10 lg:flex lg:w-[38%] lg:border-b-0 lg:border-r">
            <div>
              <HospitalLogo variant="compact" />
              <div className="section-label mt-2 text-slate-600">Purchase Portal</div>
            </div>
            <div>
              <h2 className="text-3xl font-bold tracking-tight leading-tight text-slate-900">
                Transparent.
                <br />
                Fair.
                <br />
                Simple.
              </h2>
              <p className="mt-3 text-sm text-slate-500">
                Modern tools for requesting, comparing and approving purchases.
              </p>
            </div>
            <div className="text-xs text-slate-400">
              © {new Date().getFullYear()} {hospitalName}
            </div>
          </div>
        )}

        <div className="app-main flex flex-1 items-center justify-center border-t border-[var(--line)] p-6 lg:border-t-0">
          <div className="w-full max-w-[400px]">
            <div className="mb-8 text-center lg:hidden">
              <HospitalLogo variant="compact" className="mx-auto" />
              <div className="section-label mt-2">Purchase Portal</div>
            </div>
            {children}
            {footer}
          </div>
        </div>
      </div>
    </main>
  );
}