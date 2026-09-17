import { SignInForm } from "./SignInForm";

export const metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <main id="main" className="flex min-h-dvh items-center justify-center px-4 py-14">
      <div className="w-full max-w-sm">
        <h1 className="text-title-1">Sign in</h1>
        <p className="mt-2 text-body text-ink-2">
          Staff accounts are created by invitation. If you don&rsquo;t have one, ask your manager.
        </p>
        <div className="mt-8">
          <SignInForm />
        </div>
      </div>
    </main>
  );
}
