import type { ReactNode } from "react";
import HospitalLogo from "./HospitalLogo";

export default function AuthLayout({
  hospitalName,
  title,
  subtitle,
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
    <main className="flex min-h-screen">
      {leftImage ? (
        <div
          className="hidden lg:flex w-[38%] bg-cover bg-center relative"
          style={{ backgroundImage: `url(${leftImage})` }}
        >
          {/* subtle overlay for better text if needed, but pure image for now */}
        </div>
      ) : (
        <div className="hidden lg:flex w-[38%] bg-gradient-to-br from-primary to-primary-dark text-white p-10 flex-col justify-between">
          <div>
            <div className="text-2xl font-bold tracking-tighter">Purchase Portal</div>
            <div className="text-sm opacity-70 mt-1">Varun Arjun Medical College</div>
          </div>
          <div>
            <h2 className="text-3xl font-bold tracking-tight leading-none">Transparent.<br />Fair.<br />Simple.</h2>
            <p className="mt-3 text-sm opacity-80">Modern tools for requesting, comparing and approving purchases.</p>
          </div>
          <div className="text-xs opacity-60">© {new Date().getFullYear()} {hospitalName}</div>
        </div>
      )}

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-[360px]">
          <div className="lg:hidden text-center mb-8">
            <div className="font-bold text-2xl tracking-tighter">Purchase Portal</div>
          </div>
          {children}
          {footer}
        </div>
      </div>
    </main>
  );
}