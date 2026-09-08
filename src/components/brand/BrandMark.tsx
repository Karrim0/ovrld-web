import { cn } from "@/lib/utils/cn";

export interface BrandMarkProps {
  className?: string;
  title?: string;
}

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
      <path d="M9.5 50.5 28.2 13h9.9L19.6 50.5H9.5Z" fill="currentColor" />
      <path d="M28.6 50.5 42.8 22.1 55 50.5H44.6l-3.2-8.4h-8.6l-4.2 8.4Z" fill="currentColor" opacity=".58" />
      <path d="M31.2 34.6h8.2l3.8 7.5H27.5l3.7-7.5Z" fill="currentColor" opacity=".92" />
    </svg>
  );
}
