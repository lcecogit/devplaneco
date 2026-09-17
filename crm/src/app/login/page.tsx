import { BrandPhoto } from "@/components/media/BrandPhoto";

import { SignInForm } from "./SignInForm";

export const metadata = { title: "Sign in" };

/** A two-panel sign-in: the form on the left, the brand's photography on the
 *  right. This is one of only three surfaces where a photograph is allowed
 *  (DESIGN.md §6), and the layout is what stops the form floating alone in a
 *  large empty field.
 *
 *  The image panel is decorative, so it is hidden below the large breakpoint
 *  rather than stacked — on a phone it would push the form below the fold for
 *  no gain. */
export default function LoginPage() {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <main id="main" className="flex items-center justify-center px-4 py-14 sm:px-8">
        <div className="w-full max-w-sm">
          <h1 className="text-title-1">Sign in</h1>
          <p className="mt-2 text-body text-ink-2 text-balance">
            Staff accounts are created by invitation. If you don&rsquo;t have one, ask your manager.
          </p>
          <div className="mt-8">
            <SignInForm />
          </div>
          <p className="mt-10 text-caption text-ink-3">
            Operations platform. Internal use only.
          </p>
        </div>
      </main>

      <BrandPhoto
        className="hidden lg:block"
        sizes="50vw"
        priority
        /* No `src` until a licensed asset is committed — see
           public/photos/CREDITS.md for the sourcing rules and the register. */
      />
    </div>
  );
}
