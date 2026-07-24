import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/auth/AuthCard";
import { EmailPasswordSignUpForm } from "@/components/auth/EmailPasswordSignUpForm";

export const metadata: Metadata = {
  title: "Create Your Account",
  description: "Create a Movers Now account to book and track your move.",
};

// Same email+password pattern as /partner/signup. Unlike the partner flow,
// there's no separate "business info" step here — a customer needs nothing
// beyond an account, so /customer/post-auth creates the customers row
// itself instead of handing off to a step-2 form.
export default function CustomerSignupPage({
  searchParams,
}: {
  searchParams: { next?: string };
}) {
  const next = searchParams.next;
  const postAuthPath = next ? `/customer/post-auth?next=${encodeURIComponent(next)}` : "/customer/post-auth";
  const loginHref = next ? `/customer/login?next=${encodeURIComponent(next)}` : "/customer/login";

  return (
    <AuthCard
      title="Create your account"
      subtitle="Book, track and manage your moves."
      footer={
        <>
          Already have an account?{" "}
          <Link href={loginHref} className="font-semibold text-brand-600 hover:text-brand-700">
            Sign in
          </Link>
        </>
      }
    >
      <EmailPasswordSignUpForm postAuthPath={postAuthPath} />
    </AuthCard>
  );
}
