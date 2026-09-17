/** Applies a brand's accent as CSS custom properties on a wrapper, so every
 *  component downstream keeps reading `var(--accent)` and nothing needs to
 *  know which brand it is rendering. Both steps are supplied: dark mode is a
 *  designed theme, not a computed inversion (DESIGN.md §2). */
export function BrandTheme({
  accent,
  accentDark,
  children,
}: {
  accent: string;
  accentDark: string;
  children: React.ReactNode;
}) {
  // The dark step is exposed as a second variable and selected by the media
  // query in tokens.css rather than being swapped here, so a brand change
  // never fights the theme.
  return (
    <div
      style={
        {
          "--accent": accent,
          "--accent-dark": accentDark,
        } as React.CSSProperties
      }
      className="contents"
    >
      {children}
    </div>
  );
}
