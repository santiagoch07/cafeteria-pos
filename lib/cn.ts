/** Lightweight className merger — joins truthy strings, filters falsy. */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}
