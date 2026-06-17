import Link from "next/link";
import AuthLayout from "@/components/AuthLayout";
import { getSetting } from "@/lib/db";
import SignupForm from "./SignupForm";

export const dynamic = "force-dynamic";

export default async function SignupPage() {
  const hospitalName = await getSetting("hospital_name");
  return (
    <AuthLayout
      hospitalName={hospitalName}
      title="Request access"
      subtitle="Create an account — admin approval required"
      footer={
        <p className="mt-6 text-center text-sm text-slate-500">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-sky-700 hover:underline">
            Sign in
          </Link>
        </p>
      }
    >
      <SignupForm />
    </AuthLayout>
  );
}