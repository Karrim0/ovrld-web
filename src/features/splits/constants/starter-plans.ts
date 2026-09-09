import type { StarterPlanKey } from "../types";

export interface ReadyPlanDefinition {
  key: Exclude<StarterPlanKey, "manual">;
  titleAr: string;
  titleEn: string;
  detailAr: string;
  detailEn: string;
  days: number;
  recommendedForGain?: boolean;
  womenFocused?: boolean;
}

export const STARTER_PLANS: ReadyPlanDefinition[] = [
  {
    key: "gain_glutes_4",
    titleAr: "Gain · Glutes + Legs",
    titleEn: "Gain · Glutes + Legs",
    detailAr: "السبت Lower A · الأحد Upper · الاثنين Lower B · الأربعاء Lower C",
    detailEn: "Sat Lower A · Sun Upper · Mon Lower B · Wed Lower C",
    days: 4,
    recommendedForGain: true,
    womenFocused: true,
  },
  {
    key: "full_body_3",
    titleAr: "فل بادي",
    titleEn: "Full Body",
    detailAr: "3 أيام متوازنة وسهلة في الاستشفاء",
    detailEn: "3 balanced days with simple recovery",
    days: 3,
  },
  {
    key: "upper_lower_4",
    titleAr: "أبر / لوور",
    titleEn: "Upper / Lower",
    detailAr: "يومين Upper + يومين Lower",
    detailEn: "2 Upper + 2 Lower days",
    days: 4,
  },
  {
    key: "ppl_ul_5",
    titleAr: "PPL + Upper / Lower",
    titleEn: "PPL + Upper / Lower",
    detailAr: "تكرار أعلى مع يومين راحة",
    detailEn: "Higher frequency with two rest days",
    days: 5,
  },
  {
    key: "ppl_6",
    titleAr: "Push / Pull / Legs",
    titleEn: "Push / Pull / Legs",
    detailAr: "دورة كاملة من 6 أيام",
    detailEn: "A full 6-day training cycle",
    days: 6,
  },
];

export function isGainPlanCompatibleGoal(goal: string | null | undefined) {
  return goal === "muscle_gain" || goal === "gain_weight";
}
