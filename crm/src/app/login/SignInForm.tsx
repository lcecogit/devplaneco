"use client";

import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/Button";
import { Field, TextInput } from "@/components/ui/Field";
import { createClient, isConfigured } from "@/lib/supabase/client";

export function SignInForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  // Shown on load, not only after a click: a sign-in form that cannot possibly
  // work should say so before someone types their password into it.
  const [notice, setNotice] = useState<string | null>(
    isConfigured
      ? null
      : "This build has no Supabase configuration, so sign-in cannot work. " +
        "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY are inlined at " +
        "build time, so adding them to your host after a deploy does nothing until you " +
        "redeploy. Check too that the deployment's root directory is `crm`.",
  );
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    // An unconfigured build cannot sign anyone in. The standing notice already
    // explains why, so leave it up rather than starting a spinner that can
    // only end in failure.
    if (!isConfigured) return;

    setNotice(null);

    setPending(true);
    try {
      const { error: signInError } = await createClient().auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        // Deliberately not "no account with that email": that distinction tells
        // an attacker which addresses are staff accounts.
        setError("That email and password don't match. Check both and try again.");
        return;
      }

      // A full navigation rather than router.replace: the session cookie has
      // just been written by the browser client, and a client-side transition
      // can reach the staff layout before the server sees it, which bounces
      // straight back here and reads as a login that did nothing.
      window.location.assign("/dashboard");
    } catch (cause) {
      // Anything thrown rather than returned — a network or DNS failure, a
      // blocked request, a misconfigured URL. Without this the form would sit
      // on "Signing in…" indefinitely with nothing said.
      setNotice(
        `Could not reach the authentication service. ${
          cause instanceof Error ? cause.message : "Unknown error."
        }`,
      );
    } finally {
      // In `finally` so no path can leave the button spinning.
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      {/* No visual "(required)" marker: both fields are required, so the
          marker carries no information and is just noise. The inputs keep the
          `required` attribute, which is what assistive technology reads. */}
      <Field label="Email" htmlFor="email" error={error ?? undefined}>
        <TextInput
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          invalid={Boolean(error)}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </Field>
      <Field label="Password" htmlFor="password">
        <TextInput
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          invalid={Boolean(error)}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </Field>
      <Button type="submit" variant="primary" className="mt-2 w-full" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </Button>

      {/* A configuration or connectivity fault is not a wrong password, so it
          does not sit under the email field pretending to be one. */}
      {notice ? (
        <p className="mt-4 border-l-2 border-status-critical pl-3 text-body-dense text-ink-2">
          {notice}
        </p>
      ) : null}

      {/* The project this build talks to. One line, and it turns "it won't let
          me in" into "it is pointed at the wrong database". */}
      {isConfigured ? (
        <p className="mt-6 text-caption text-ink-3">
          Signing in to{" "}
          <span data-numeric className="font-mono">
            {new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname.split(".")[0]}
          </span>
        </p>
      ) : null}

      <p role="status" aria-live="polite" className="sr-only">
        {pending ? "Signing in" : (error ?? notice ?? "")}
      </p>
    </form>
  );
}
