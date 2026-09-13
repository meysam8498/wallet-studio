import { cn } from "@/lib/utils";

/**
 * Ledger Studio mark — a thin-framed monogram evoking a framed canvas.
 * Pure SVG so it inherits currentColor and needs no asset pipeline.
 */
export function LedgerMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
      className={cn("shrink-0", className)}
    >
      <rect x="1.5" y="1.5" width="37" height="37" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M13 27V13h9"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="square"
      />
      <path
        d="M13 20h6"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="square"
      />
      <circle cx="27" cy="27" r="1.6" fill="currentColor" />
    </svg>
  );
}
