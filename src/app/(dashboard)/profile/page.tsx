import Link from "next/link";
import { ArrowUpLeft, Dumbbell, Scale, Settings, ShieldCheck, Sparkles, UserRound, Users } from "lucide-react";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { PageContainer } from "@/components/layout/PageContainer";
import { LanguageSwitcher } from "@/components/localization/LanguageSwitcher";
import { ThemeSwitcher } from "@/components/theme/ThemeSwitcher";
import { LogoutButton } from "@/features/auth/components/LogoutButton";
import { requireCurrentUser } from "@/features/auth/services/auth.server";
import { createClient } from "@/lib/supabase/server";

export default async function ProfilePage() {
  const user = await requireCurrentUser();
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, avatar_url")
    .eq("id", user.id)
    .maybeSingle();
  const displayName = profile?.display_name ?? user.email?.split("@")[0] ?? "لاعب";

  return (
    <>
      <DashboardHeader title="حسابي والإعدادات" actions={<LogoutButton />} showProfile={false} />
      <PageContainer className="space-y-4 pb-8 pt-5">
        <section className="gc-hero-card relative overflow-hidden rounded-[30px] p-5 sm:p-6">
          <div className="flex items-center gap-4">
            {profile?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatar_url} alt="" className="h-20 w-20 rounded-[24px] border border-white/10 object-cover shadow-xl" />
            ) : (
              <span className="grid h-20 w-20 place-items-center rounded-[24px] bg-indigo-300 text-neutral-950"><UserRound className="h-8 w-8" /></span>
            )}
            <div className="min-w-0 flex-1">
              <p className="gc-eyebrow">حسابك الرياضي</p>
              <h2 className="mt-1 truncate text-2xl font-bold tracking-[-0.035em]">{displayName}</h2>
              <p className="mt-1 truncate text-sm text-neutral-400">{user.email}</p>
            </div>
          </div>
        </section>

        <div className="grid gap-3 sm:grid-cols-2">
          <Link href="/profile/settings" className="gc-card-interactive flex items-center gap-3 p-4">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-indigo-300/10 text-indigo-300"><Settings className="h-5 w-5" /></span>
            <span className="min-w-0 flex-1"><span className="block font-bold">عدّل حسابك</span><span className="block text-sm text-neutral-500">الاسم والصورة</span></span>
            <ArrowUpLeft className="h-4 w-4 text-neutral-600" />
          </Link>
          <Link href="/split/personal" className="gc-card-interactive flex items-center gap-3 p-4">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/[0.05] text-neutral-300"><Dumbbell className="h-5 w-5" /></span>
            <span className="min-w-0 flex-1"><span className="block font-bold">جدول التمرين</span><span className="block text-sm text-neutral-500">ظبّط جدولك الشخصي</span></span>
            <ArrowUpLeft className="h-4 w-4 text-neutral-600" />
          </Link>
          <Link href="/progress/body" className="gc-card-interactive flex items-center gap-3 p-4">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-300/10 text-emerald-300"><Scale className="h-5 w-5" /></span>
            <span className="min-w-0 flex-1"><span className="block font-bold">متابعة الجسم</span><span className="block text-sm text-neutral-500">الوزن والهدف ومواعيد القياس</span></span>
            <ArrowUpLeft className="h-4 w-4 text-neutral-600" />
          </Link>
          <Link href="/progress/gain" className="gc-card-interactive flex items-center gap-3 p-4">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-300/10 text-emerald-300"><Sparkles className="h-5 w-5" /></span>
            <span className="min-w-0 flex-1"><span className="block font-bold">Gain Mode</span><span className="block text-sm text-neutral-500">ميزة زيادة الوزن المخصصة</span></span>
            <ArrowUpLeft className="h-4 w-4 text-neutral-600" />
          </Link>
          <Link href="/group" className="gc-card-interactive flex items-center gap-3 p-4">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/[0.05] text-neutral-300"><Users className="h-5 w-5" /></span>
            <span className="min-w-0 flex-1"><span className="block font-bold">Crew</span><span className="block text-sm text-neutral-500">ميزة اجتماعية اختيارية، مش محور التطبيق</span></span>
            <ArrowUpLeft className="h-4 w-4 text-neutral-600" />
          </Link>
        </div>

        <section>
          <div className="mb-3 px-1"><p className="gc-eyebrow">التطبيق</p><h3 className="mt-1 text-lg font-bold">اللغة والمظهر</h3></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <LanguageSwitcher variant="panel" />
            <ThemeSwitcher variant="panel" />
          </div>
        </section>

        <section className="gc-card flex items-start gap-3 p-4">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-indigo-300" />
          <div><p className="font-bold">بيانات تمرينك خاصة</p><p className="mt-1 text-sm leading-6 text-neutral-500">تفاصيل السِتات وسجل تمارينك بيفضلوا خاصين. الجروب بيشوف ملخصات بسيطة بس حسب إعداداتك.</p></div>
        </section>
      </PageContainer>
    </>
  );
}
