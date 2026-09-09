import { cn } from "@/lib/utils/cn";

export interface BrandMarkProps {
  className?: string;
  title?: string;
}

/**
 * OVRLD mark: an open O (the training loop) crossed by an ascending load bar.
 * It stays legible at favicon size and uses the shared brand accent in both themes.
 */
export function BrandMark({ className, title = "OVRLD" }: BrandMarkProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      role="img"
      aria-label={title}
      className={cn("h-6 w-6", className)}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M42.5 16.4A20 20 0 1 0 45.7 44"
        stroke="currentColor"
        strokeWidth="8"
        strokeLinecap="round"
      />
      <path
        d="M29 47.5 45.8 15.8"
        stroke="var(--brand-accent, #34d399)"
        strokeWidth="8"
        strokeLinecap="round"
      />
      <path
        d="M41.7 17.6h8.1v8.1"
        stroke="var(--brand-accent, #34d399)"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
