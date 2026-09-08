import Link from "next/link";
import { cn } from "@/lib/utils/cn";

export function ProgressTabs({ active }: { active: "training" | "body" }) {
  return (
    <nav className="gc-segmented" aria-label="نوع التقدم">
      <Link href="/progress" aria-current={active === "training" ? "page" : undefined} className={cn("gc-segmented-item", active === "training" && "gc-segmented-item-active")}>التمرين</Link>
      <Link href="/progress/body" aria-current={active === "body" ? "page" : undefined} className={cn("gc-segmented-item", active === "body" && "gc-segmented-item-active")}>الجسم</Link>
    </nav>
  );
}
