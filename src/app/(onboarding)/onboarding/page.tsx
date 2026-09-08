import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ShieldCheck, Users } from "lucide-react";
import { SoloModeButton } from "@/features/onboarding/components/SoloModeButton";
import { requireCurrentUser } from "@/features/auth/services/auth.server";
import { getGroupMembershipForUser } from "@/features/groups/services/group.server";
import { createClient } from "@/lib/supabase/server";

export default async function OnboardingPage() {
  const user = await requireCurrentUser();
  const membership = await getGroupMembershipForUser(user.id);
  if (membership) {
    const supabase = await createClient();
    const { data } = await supabase.from("profiles").select("onboarding_completed_at").eq("id", user.id).maybeSingle();
    redirect(data?.onboarding_completed_at ? "/dashboard" : "/body-goal");
  }

  return (
    <div className="space-y-6">
      <div className="gc-onboarding-progress" aria-label="خطوات البداية">
        <span className="gc-onboarding-step gc-onboarding-step-active"><strong>1</strong><small>مساحتك</small></span>
        <span className="gc-onboarding-progress-line" />
        <span className="gc-onboarding-step"><strong>2</strong><small>هدفك</small></span>
        <span className="gc-onboarding-progress-line" />
        <span className="gc-onboarding-step"><strong>3</strong><small>جدولك</small></span>
      </div>

      <section>
        <p className="gc-eyebrow">خلّينا نبدأ من تمرينك</p>
        <h1 className="mt-2 text-3xl font-black tracking-[-0.055em]">جدولك، أرقامك، وتقدمك.</h1>
        <p className="mt-2 text-sm leading-6 text-neutral-400">
          OVRLD Gym Tracker كامل. وبعد ما نجهّز مساحتك، تقدر تستخدم النسخة العادية أو تدخل Goal Mode مخصص لهدفك.
        </p>
      </section>

      <SoloModeButton />

      <div className="gc-onboarding-skip-note">
        <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-300" />
        <p className="text-sm leading-6">مش لازم تدخل بيانات جسم عشان تستخدم OVRLD. Goal Mode اختياري وبيتفعّل بإرادتك.</p>
      </div>

      <details className="gc-card group overflow-hidden">
        <summary className="flex min-h-14 list-none items-center gap-3 px-4 [&::-webkit-details-marker]:hidden">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/[0.05] text-neutral-300"><Users className="h-4 w-4" /></span>
          <span className="min-w-0 flex-1"><strong className="block text-sm">داخل مع Crew؟</strong><span className="block truncate text-xs text-neutral-500">اختياري ومش جزء من الـcore دلوقتي.</span></span>
          <ArrowLeft className="h-4 w-4 text-neutral-500" />
        </summary>
        <div className="grid gap-2 border-t border-white/[0.06] p-3 min-[380px]:grid-cols-2">
          <Link href="/create-group" className="gc-secondary-button">اعمل Crew</Link>
          <Link href="/join-group" className="gc-secondary-button">ادخل بكود</Link>
        </div>
      </details>
    </div>
  );
}
