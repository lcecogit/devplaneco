/** Tiny class joiner. Not a dependency — this is all `clsx` does for us. */
export function cn(...values: (string | false | null | undefined)[]): string {
  return values.filter(Boolean).join(" ");
}
