/** Applies a brand's identity as CSS custom properties on a wrapper, so every
 *  component downstream keeps reading `var(--accent)` and nothing needs to
 *  know which brand it is rendering.
 *
 *  Four values, not one, because an accent is not a single colour: a fill,
 *  what sits on that fill, the same family stepped for use as text, and the
 *  dark-mode pair. EcoGreen is the case that proves it — its lime works as a
 *  fill at any size and fails as text at 2.38:1. */
export function BrandTheme({
  accent,
  accentDark,
  accentText,
  accentTextDark,
  accentContrast,
  children,
}: {
  accent: string;
  accentDark: string;
  accentText: string;
  accentTextDark: string;
  accentContrast: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={
        {
          "--accent": accent,
          "--accent-contrast": accentContrast,
          "--accent-text": accentText,
          // Consumed by the dark-mode rules in tokens.css, which redefine
          // --accent and --accent-text from these when the theme flips.
          "--brand-accent-dark": accentDark,
          "--brand-accent-text-dark": accentTextDark,
        } as React.CSSProperties
      }
      className="contents"
    >
      {children}
    </div>
  );
}
