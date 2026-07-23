import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/auth/AuthCard";
import { EmailPasswordSignInForm } from "@/components/auth/EmailPasswordSignInForm";

export const metadata: Metadata = {
  title: "Partner Sign In",
};

// Google/magic link buttons can be added here later as siblings to
// <EmailPasswordSignInForm />, same as on the signup page.
export default function PartnerLoginPage() {
  return (
    <AuthCard
      title="Sign in to your partner account"
      footer={
        <>
          <Link href="/partner/forgot-password" className="font-semibold text-brand-600 hover:text-brand-700">
            Forgot password?
          </Link>
          <span className="mx-2 text-ink-700">·</span>
          Don&apos;t have an account?{" "}
          <Link href="/partner/signup" className="font-semibold text-brand-600 hover:text-brand-700">
            Become a partner
          </Link>
        </>
      }
    >
      <EmailPasswordSignInForm redirectTo="/partner/post-auth" />
    </AuthCard>
  );
}
