"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, CircleDashed } from "lucide-react";
import { useLanguage } from "@/contexts/language-context";
import type { ProfileCompletenessItemKey, ProfileCompletenessSnapshot } from "../types";

const COPY: Record<ProfileCompletenessItemKey, {
  labelAr: string;
  labelEn: string;
  detailAr: string;
  detailEn: string;
  ctaAr: string;
  ctaEn: string;
}> = {
  basic_info: {
    labelAr: "البيانات الأساسية",
    labelEn: "Basic info",
    detailAr: "أضف سنك عشان يفضل ملفك الأساسي كامل.",
    detailEn: "Add your age to complete the basic profile.",
    ctaAr: "كمّل البيانات",
    ctaEn: "Complete basics",
  },
  current_weight: {
    labelAr: "الوزن الحالي",
    labelEn: "Current weight",
    detailAr: "حدّث وزنك عشان الاتجاهات والمراجعات تعتمد على قراءة حديثة.",
    detailEn: "Update your weight so trends and reviews use a recent reading.",
    ctaAr: "حدّث الوزن",
    ctaEn: "Update weight",
  },
  height: {
    labelAr: "الطول",
    labelEn: "Height",
    detailAr: "أضف طولك لملف الجسم الأساسي.",
    detailEn: "Add your height to the body profile.",
    ctaAr: "أضف الطول",
    ctaEn: "Add height",
  },
  goal: {
    labelAr: "الهدف",
    labelEn: "Goal",
    detailAr: "حدد هدفك عشان OVRLD يديك سياق مناسب بدل اقتراحات عامة.",
    detailEn: "Set your goal so OVRLD can give relevant context instead of generic prompts.",
    ctaAr: "حدد الهدف",
    ctaEn: "Set goal",
  },
  training_level: {
    labelAr: "مستوى التدريب",
    labelEn: "Training level",
    detailAr: "حدد خبرتك التدريبية عشان إعدادك يبقى أوضح.",
    detailEn: "Set your training experience so your setup has the right context.",
    ctaAr: "حدد المستوى",
    ctaEn: "Set level",
  },
  weekly_availability: {
    labelAr: "الأيام المتاحة",
    labelEn: "Weekly availability",
    detailAr: "حدد كام يوم تقدر تتمرنهم أسبوعيًا.",
    detailEn: "Set how many days you can train each week.",
    ctaAr: "حدد الأيام",
    ctaEn: "Set availability",
  },
  active_split: {
    labelAr: "جدول تمرين فعّال",
    labelEn: "Active split",
    detailAr: "عندك هدف، لكن جدولك لسه محتاج يوم تمرين فعلي وتمارين عشان المتابعة تشتغل صح.",
    detailEn: "You have a goal, but your split still needs a real training day and exercises for tracking to work properly.",
    ctaAr: "كمّل جدول التمرين",
    ctaEn: "Complete training setup",
  },
  body_measurements: {
    labelAr: "قياسات الجسم",
    labelEn: "Body measurements",
    detailAr: "أضف قياسات البداية عشان تقدم شكل الجسم مايعتمدش على الميزان لوحده.",
    detailEn: "Add baseline body measurements so physique progress is not judged by scale weight alone.",
    ctaAr: "أضف القياسات",
    ctaEn: "Add measurements",
  },
  nutrition_target: {
    labelAr: "هدف التغذية",
    labelEn: "Nutrition target",
    detailAr: "Gain Mode شغال؛ ثبت هدف السعرات والبروتين عشان مراجعات التغذية تبقى أدق.",
    detailEn: "Gain Mode is active; set calorie and protein targets so nutrition reviews have a clear baseline.",
    ctaAr: "ظبط أهداف التغذية",
    ctaEn: "Set nutrition targets",
  },
};

export function ProfileCompletenessCard({ snapshot }: { snapshot: ProfileCompletenessSnapshot }) {
  const { language } = useLanguage();
  const ar = language === "ar";
  const next = snapshot.nextAction;
  const nextCopy = next ? COPY[next.key] : null;

  return (
    <section data-no-localize className="gc-card overflow-hidden p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-emerald-300/10 text-emerald-300">
          {snapshot.score === 100 ? <CheckCircle2 className="h-5 w-5" /> : <CircleDashed className="h-5 w-5" />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <p className="gc-eyebrow">{ar ? "اكتمال الملف" : "Profile completeness"}</p>
            <strong className="text-sm tabular-nums text-emerald-300">{snapshot.score}%</strong>
          </div>
          <h2 className="mt-1 text-lg font-black">{ar ? `ملفك مكتمل بنسبة ${snapshot.score}%` : `Your profile is ${snapshot.score}% complete`}</h2>
        </div>
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.06]">
        <div className="h-full rounded-full bg-[var(--accent)] transition-all" style={{ width: `${snapshot.score}%` }} />
      </div>

      {next && nextCopy ? (
        <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-overlay)] p-3">
          <p className="text-sm font-black">{ar ? nextCopy.labelAr : nextCopy.labelEn}</p>
          <p className="mt-1 text-xs leading-5 text-neutral-500">{ar ? nextCopy.detailAr : nextCopy.detailEn}</p>
          <Link href={next.href} className="gc-secondary-button mt-3 w-full">
            {ar ? nextCopy.ctaAr : nextCopy.ctaEn}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <p className="mt-3 text-xs font-semibold leading-5 text-neutral-500">
          {ar ? "كل عناصر الملف المستخدمة حاليًا مكتملة." : "All profile elements relevant to your current setup are complete."}
        </p>
      )}
    </section>
  );
}
