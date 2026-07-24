import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/auth/AuthCard";
import { EmailPasswordSignUpForm } from "@/components/auth/EmailPasswordSignUpForm";

export const metadata: Metadata = {
  title: "Become a Transport Partner",
  description: "Create your Movers Now transport partner account.",
};

// Step 1 of 3. Only renders the email+password form for now — Google/magic
// link/phone OTP can be added here later as sibling buttons above or below
// <EmailPasswordSignUpForm />, without touching steps 2 or 3.
export default function PartnerSignupPage() {
  return (
    <AuthCard
      title="Become a transport partner"
      subtitle="Step 1 of 3 — create your account"
      footer={
        <>
          Already have an account?{" "}
          <Link href="/partner/login" className="font-semibold text-brand-600 hover:text-brand-700">
            Sign in
          </Link>
        </>
      }
    >
      <EmailPasswordSignUpForm postAuthPath="/partner/post-auth" />
    </AuthCard>
  );
}
