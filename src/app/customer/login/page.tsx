import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/auth/AuthCard";
import { EmailPasswordSignInForm } from "@/components/auth/EmailPasswordSignInForm";

export const metadata: Metadata = {
  title: "Sign In",
};

export default function CustomerLoginPage({
  searchParams,
}: {
  searchParams: { next?: string };
}) {
  const next = searchParams.next;
  const postAuthPath = next ? `/customer/post-auth?next=${encodeURIComponent(next)}` : "/customer/post-auth";
  const signupHref = next ? `/customer/signup?next=${encodeURIComponent(next)}` : "/customer/signup";

  return (
    <AuthCard
      title="Sign in to your account"
      footer={
        <>
          Don&apos;t have an account?{" "}
          <Link href={signupHref} className="font-semibold text-brand-600 hover:text-brand-700">
            Create one
          </Link>
        </>
      }
    >
      <EmailPasswordSignInForm redirectTo={postAuthPath} />
    </AuthCard>
  );
}
