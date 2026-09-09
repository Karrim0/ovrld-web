import type { LucideIcon } from "lucide-react";

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
}

export function EmptyState({ icon: Icon, title, description }: EmptyStateProps) {
  return (
    <div className="gc-card flex min-h-52 flex-col items-center justify-center gap-3 p-8 text-center">
      {Icon ? <span className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-300/10 text-emerald-300"><Icon className="h-6 w-6" aria-hidden /></span> : null}
      <p className="text-lg font-bold">{title}</p>
      {description ? <p className="max-w-md text-sm leading-6 text-neutral-500">{description}</p> : null}
    </div>
  );
}
