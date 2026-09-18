import Image from "next/image";

import { cn } from "@/lib/cn";

/** Photography slot.
 *
 *  Photographs earn a place on exactly three surfaces — the sign-in screen,
 *  brand-facing portal pages, and the marketing side of the embeddable widget.
 *  Never inside the CRM's data surfaces: a photograph behind a leads table is
 *  noise competing with the thing the user came to read (DESIGN.md §6).
 *
 *  When no asset is present this renders a deliberate, quiet surface rather
 *  than a broken frame or a grey box. That matters: the product has to look
 *  finished before the photography exists, and better once it lands, without
 *  either state looking like a placeholder. */
export function BrandPhoto({
  src,
  alt,
  priority = false,
  className,
  sizes = "(max-width: 768px) 100vw, 50vw",
}: {
  /** Omit until a licensed asset exists — see public/photos/CREDITS.md. */
  src?: string;
  /** Required whenever `src` is set. Describes what the photo shows; it is
   *  never a caption and never keyword-stuffed. */
  alt?: string;
  priority?: boolean;
  className?: string;
  sizes?: string;
}) {
  if (!src) return <PhotoFallback className={className} />;

  return (
    <div className={cn("relative overflow-hidden bg-surface-sunken", className)}>
      <Image
        src={src}
        alt={alt ?? ""}
        fill
        sizes={sizes}
        priority={priority}
        quality={82}
        className="object-cover"
      />
      {/* A single consistent grade across all six brands, so six sets of
          photography still read as one platform. Kept subtle: it corrects, it
          does not stylise. */}
      <div className="pointer-events-none absolute inset-0 bg-ink-1/[0.04] mix-blend-multiply" aria-hidden />
    </div>
  );
}

/** The no-photo state.
 *
 *  Near-neutral on purpose. An earlier version tinted the whole panel with the
 *  accent and read as a colour swatch rather than as a surface where a
 *  photograph belongs — it announced the brand instead of holding a space
 *  quietly. This is a material: a soft tonal field, a barely-there accent
 *  breath in one corner, and a vignette to give it depth. */
export function PhotoFallback({ className }: { className?: string }) {
  return (
    <div
      className={cn("relative overflow-hidden bg-surface-sunken", className)}
      aria-hidden
    >
      <div
        className="absolute inset-0 opacity-[0.55]"
        style={{
          background:
            "radial-gradient(120% 90% at 20% 15%, var(--accent-wash) 0%, transparent 60%)",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(100% 100% at 50% 0%, transparent 40%, rgb(0 0 0 / 0.07) 100%)",
        }}
      />
    </div>
  );
}
