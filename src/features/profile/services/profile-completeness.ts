import type {
  ProfileCompletenessItem,
  ProfileCompletenessSnapshot,
  ProfileCompletenessSource,
} from "../types";

const DAY_MS = 86_400_000;

export function isProfileWeightStale(
  latestWeightAt: string | null,
  weighInIntervalDays: number | null,
  now = new Date(),
) {
  if (!latestWeightAt) return true;
  const timestamp = new Date(latestWeightAt).getTime();
  if (!Number.isFinite(timestamp)) return true;
  const intervalDays = Math.max(1, Math.min(30, weighInIntervalDays ?? 14));
  return now.getTime() - timestamp > intervalDays * DAY_MS;
}

export function calculateProfileCompleteness(
  source: ProfileCompletenessSource,
  now = new Date(),
): ProfileCompletenessSnapshot {
  const weightStale = isProfileWeightStale(source.latestWeightAt, source.weighInIntervalDays, now);
  const items: ProfileCompletenessItem[] = [
    { key: "basic_info", complete: source.ageYears !== null && source.sex !== null, href: source.sex === null ? "/profile/settings#profile-sex" : "/profile/settings#profile-age" },
    { key: "current_weight", complete: source.latestWeightAt !== null && !weightStale, href: "/progress/body#weight" },
    { key: "height", complete: source.heightCm !== null, href: "/profile/settings#profile-height" },
    { key: "goal", complete: source.goalType !== null, href: "/profile/settings#profile-goal" },
    { key: "training_level", complete: source.trainingLevel !== null, href: "/profile/settings#profile-training-level" },
    { key: "weekly_availability", complete: source.weeklyTrainingDays !== null, href: "/profile/settings#profile-weekly-availability" },
    { key: "active_split", complete: source.hasActiveSplit, href: "/split/personal" },
    { key: "body_measurements", complete: source.hasBodyMeasurements, href: "/progress/body#measurements" },
  ];

  if (source.gainModeActive) {
    items.push({
      key: "nutrition_target",
      complete: source.hasNutritionTarget,
      href: "/progress/gain/nutrition#nutrition-targets",
    });
  }

  const completeCount = items.filter((item) => item.complete).length;
  const score = items.length ? Math.round((completeCount / items.length) * 100) : 100;

  const priority = [
    "basic_info",
    "height",
    "goal",
    "training_level",
    "weekly_availability",
    "active_split",
    "current_weight",
    "body_measurements",
    "nutrition_target",
  ];
  const nextAction = priority
    .map((key) => items.find((item) => item.key === key && !item.complete))
    .find(Boolean) ?? null;

  return {
    score,
    completeCount,
    totalCount: items.length,
    items,
    nextAction,
    weightStale,
    gainModeActive: source.gainModeActive,
  };
}
