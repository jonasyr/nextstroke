import type { ComponentProps, ReactNode } from "react";

/** A 44 × 44 icon-only button; `label` is its accessible name (D-056, WCAG 4.1.2). */
export function IconButton({
  label,
  children,
  className = "",
  ...rest
}: { label: string; children: ReactNode } & Omit<ComponentProps<"button">, "aria-label">) {
  return (
    <button type="button" className={`ns-ib ${className}`} aria-label={label} {...rest}>
      {children}
    </button>
  );
}

/** Lucide icon props used everywhere, so strokes and sizes match. */
export const ICON = { size: 22, strokeWidth: 2, "aria-hidden": true } as const;
