import Link from "next/link";
import AuthLayout from "@/components/AuthLayout";
import { getSetting } from "@/lib/db";
import LoginForm from "./LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const hospitalName = await getSetting("hospital_name");
  return (
    <AuthLayout
      hospitalName={hospitalName}
      title="Welcome back"
      subtitle="Sign in to the purchase verification portal"
      leftImage="/signup.jpg"
      footer={
        <>
          <p className="mt-6 text-center text-sm text-slate-500">
            New here?{" "}
            <Link href="/signup" className="font-semibold text-primary hover:underline">
              Create an account
            </Link>
          </p>
          <p className="mt-4 text-center text-xs text-slate-400">All activity is logged for audit purposes.</p>
        </>
      }
    >
      <LoginForm />
    </AuthLayout>
  );
}