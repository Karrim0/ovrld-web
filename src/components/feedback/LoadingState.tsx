import { LoaderCircle } from "lucide-react";

export interface LoadingStateProps {
  label?: string;
}

export function LoadingState({ label = "بنحمّل…" }: LoadingStateProps) {
  return (
    <div className="flex min-h-[45dvh] flex-col items-center justify-center gap-3 p-8 text-sm font-bold text-neutral-500" role="status">
      <span className="grid h-12 w-12 place-items-center rounded-2xl border border-emerald-300/15 bg-emerald-300/[0.06] text-emerald-300"><LoaderCircle className="h-6 w-6 animate-spin" /></span>
      {label}
    </div>
  );
}
