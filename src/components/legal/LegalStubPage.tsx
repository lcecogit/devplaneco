import Link from "next/link";
import { Container } from "@/components/ui/Container";

export function LegalStubPage({
  title,
  intro,
}: {
  title: string;
  intro: string;
}) {
  return (
    <main id="main-content" className="py-16 sm:py-20">
      <Container className="max-w-2xl">
        <h1 className="font-heading text-3xl font-extrabold text-ink-900 sm:text-4xl">
          {title}
        </h1>
        <p className="mt-4 text-lg text-ink-700">{intro}</p>
        <p className="mt-2 text-sm text-ink-700">
          This page is being finalised with our legal team and will be
          published in full before the site goes live.
        </p>
        <Link href="/" className="mt-8 inline-block text-sm font-semibold text-brand-600 hover:text-brand-700">
          ← Back to homepage
        </Link>
      </Container>
    </main>
  );
}
