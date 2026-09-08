import { fetchProgressIntelligence, type ProgressIntelligenceSummary } from "@/features/progress/services/progress-intelligence.service";
import { fetchAdherenceSummary, type AdherenceSummary } from "@/features/progress/services/progress.service";
import type { UUID } from "@/types";

export type ProcessLoopTone = "positive" | "neutral" | "watch" | "body";
export type ProcessLoopActionKind = "body" | "attention" | "progress" | "adherence" | "collecting";

export interface ProcessLoopAction {
  id: string;
  kind: ProcessLoopActionKind;
  tone: ProcessLoopTone;
  eyebrow: string;
  title: string;
  detail: string;
  href: string;
  cta: string;
  exerciseName?: string;
}

export interface ProcessLoopSnapshot {
  action: ProcessLoopAction;
  weeklyCompleted: number;
  weeklyScheduled: number;
  weeklyAdherence: number | null;
  improvingCount: number;
  attentionCount: number;
  trackedExercises: number;
  bodyTrackingEnabled: boolean;
  bodyCheckInDue: boolean;
  insights: ProgressIntelligenceSummary["insights"];
}

function bodyCheckInIsDue(intelligence: ProgressIntelligenceSummary): boolean {
  const body = intelligence.body;
  if (!body?.goal) return false;
  if (!body.latest) return true;
  if (!body.nextWeighInAt) return false;
  return new Date(body.nextWeighInAt).getTime() <= Date.now();
}

function buildPrimaryAction(
  intelligence: ProgressIntelligenceSummary,
  adherence: AdherenceSummary,
): ProcessLoopAction {
  const bodyDue = bodyCheckInIsDue(intelligence);
  if (bodyDue) {
    return {
      id: "body-checkin",
      kind: "body",
      tone: "body",
      eyebrow: "خطوة صغيرة دلوقتي",
      title: intelligence.body?.latest ? "معاد قراءة الوزن جه" : "سجّل نقطة البداية",
      detail: intelligence.body?.latest
        ? "قراءة سريعة كفاية. الاتجاه أهم من رقم يوم واحد."
        : "عندك هدف جسم متسجل؛ أول قراءة هتفتح متابعة الاتجاه.",
      href: "/progress/body",
      cta: "سجّل القراءة",
    };
  }

  const slipping = intelligence.exercises.find((item) => item.status === "slipping");
  const plateau = intelligence.exercises.find((item) => item.status === "plateau");
  const attention = slipping ?? plateau;
  if (attention) {
    return {
      id: `attention-${attention.exerciseId}`,
      kind: "attention",
      tone: "watch",
      eyebrow: "خلي عينك هنا",
      title: "محتاج متابعة",
      exerciseName: attention.exerciseName,
      detail: attention.status === "slipping"
        ? "الأداء نازل عن الفترة اللي قبلها. راقب التنفيذ والراحة كذا تمرينة قبل ما تغيّر الخطة."
        : "الأرقام ثابتة بقالها كذا تسجيل. حاول تكسب عدة أو جودة تنفيذ قبل أي تغيير كبير.",
      href: `/progress/exercises/${attention.exerciseId}`,
      cta: "شوف الاتجاه",
    };
  }

  if (adherence.weeklyScheduled > 0 && adherence.weeklyCompleted < adherence.weeklyScheduled) {
    const remaining = Math.max(0, adherence.weeklyScheduled - adherence.weeklyCompleted);
    return {
      id: "weekly-loop",
      kind: "adherence",
      tone: "neutral",
      eyebrow: "حلقة الأسبوع",
      title: remaining === 1 ? "فاضلك تمرينة واحدة على الخطة" : `فاضلك ${remaining} تمرينات على الخطة`,
      detail: "مش محتاج تعوّض كل حاجة مرة واحدة. كمّل أقرب تمرينة وخلي التسجيل هو المرجع.",
      href: "/workout/today",
      cta: "افتح تمرينة النهارده",
    };
  }

  const improving = intelligence.exercises
    .filter((item) => item.status === "improving")
    .sort((a, b) => (b.strengthDeltaPercent ?? 0) - (a.strengthDeltaPercent ?? 0))[0];
  if (improving) {
    return {
      id: `improving-${improving.exerciseId}`,
      kind: "progress",
      tone: "positive",
      eyebrow: "العملية ماشية",
      title: "بيتحسن",
      exerciseName: improving.exerciseName,
      detail: `مؤشر القوة أعلى بحوالي ${Math.abs(improving.strengthDeltaPercent ?? 0).toFixed(1)}%. خليك ثابت في التسجيل والتنفيذ.`,
      href: `/progress/exercises/${improving.exerciseId}`,
      cta: "شوف التقدم",
    };
  }

  if (intelligence.trackedExercises === 0) {
    return {
      id: "collect-first",
      kind: "collecting",
      tone: "neutral",
      eyebrow: "لسه بنبني الصورة",
      title: "أول كام تمرينة هما نقطة البداية",
      detail: "سجّل الوزن والعدات زي ما حصلوا فعلًا. بعد كذا جلسة OVRLD هيبدأ يفرّق بين التقدم والتذبذب.",
      href: "/workout/today",
      cta: "افتح تمرينة النهارده",
    };
  }

  return {
    id: "steady-process",
    kind: "progress",
    tone: "positive",
    eyebrow: "مفيش إنذار محتاج قرار",
    title: "كمّل بنفس الإيقاع",
    detail: "الأرقام مستقرة ومفيش إشارة قوية تستاهل تغيّر الجدول دلوقتي.",
    href: "/progress",
    cta: "راجع الاتجاه",
  };
}

export async function fetchProcessLoop(userId: UUID): Promise<ProcessLoopSnapshot> {
  const [intelligence, adherence] = await Promise.all([
    fetchProgressIntelligence(userId),
    fetchAdherenceSummary(userId),
  ]);

  return {
    action: buildPrimaryAction(intelligence, adherence),
    weeklyCompleted: adherence.weeklyCompleted,
    weeklyScheduled: adherence.weeklyScheduled,
    weeklyAdherence: adherence.weekly,
    improvingCount: intelligence.improvingCount,
    attentionCount: intelligence.plateauCount + intelligence.slippingCount,
    trackedExercises: intelligence.trackedExercises,
    bodyTrackingEnabled: Boolean(intelligence.body?.goal),
    bodyCheckInDue: bodyCheckInIsDue(intelligence),
    insights: intelligence.insights,
  };
}
