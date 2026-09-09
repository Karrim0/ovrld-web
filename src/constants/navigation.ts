import type { LucideIcon } from "lucide-react";
import { ChartNoAxesCombined, Dumbbell, House, Rows3, UserRound } from "lucide-react";

export interface NavigationItem {
  id: "home" | "split" | "workout" | "progress" | "profile";
  labelAr: string;
  labelEn: string;
  href: string;
  icon: LucideIcon;
  activePrefixes: readonly string[];
}

export const MAIN_NAVIGATION_ITEMS: readonly NavigationItem[] = [
  { id: "home", labelAr: "الرئيسية", labelEn: "Home", href: "/dashboard", icon: House, activePrefixes: ["/dashboard"] },
  { id: "split", labelAr: "جدولي", labelEn: "My Split", href: "/split/personal", icon: Rows3, activePrefixes: ["/split"] },
  { id: "workout", labelAr: "التمرين", labelEn: "Workout", href: "/workout/today", icon: Dumbbell, activePrefixes: ["/workout"] },
  { id: "progress", labelAr: "تقدمي", labelEn: "Progress", href: "/progress", icon: ChartNoAxesCombined, activePrefixes: ["/progress", "/workout/history"] },
  { id: "profile", labelAr: "حسابي", labelEn: "Account", href: "/profile", icon: UserRound, activePrefixes: ["/profile", "/more", "/group"] },
];
