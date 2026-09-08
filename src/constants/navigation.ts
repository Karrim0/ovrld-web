import type { LucideIcon } from "lucide-react";
import { ChartNoAxesCombined, Dumbbell, House, Rows3, UserRound } from "lucide-react";

export interface NavigationItem {
  id: "home" | "split" | "workout" | "progress" | "profile";
  label: string;
  href: string;
  icon: LucideIcon;
  activePrefixes: readonly string[];
}

export const MAIN_NAVIGATION_ITEMS: readonly NavigationItem[] = [
  { id: "home", label: "الرئيسية", href: "/dashboard", icon: House, activePrefixes: ["/dashboard"] },
  { id: "split", label: "جدولي", href: "/split/personal", icon: Rows3, activePrefixes: ["/split"] },
  { id: "workout", label: "التمرين", href: "/workout/today", icon: Dumbbell, activePrefixes: ["/workout"] },
  { id: "progress", label: "تقدمي", href: "/progress", icon: ChartNoAxesCombined, activePrefixes: ["/progress", "/workout/history"] },
  { id: "profile", label: "حسابي", href: "/profile", icon: UserRound, activePrefixes: ["/profile", "/more", "/group"] },
];
