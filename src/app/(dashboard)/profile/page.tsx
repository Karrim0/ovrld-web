import Link from "next/link";
import { ArrowUpLeft, Dumbbell, Scale, Settings, Sparkles, UserRound, Users } from "lucide-react";
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
      <DashboardHeader title="حسابي" actions={<LogoutButton />} showProfile={false} />
      <PageContainer className="space-y-4 pb-8 pt-4">
        <section className="gc-profile-summary">
          {profile?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.avatar_url} alt="" className="h-16 w-16 rounded-2xl border border-white/10 object-cover" />
          ) : (
            <span className="grid h-16 w-16 place-items-center rounded-2xl bg-indigo-300 text-neutral-950"><UserRound className="h-7 w-7" /></span>
          )}
          <div className="min-w-0 flex-1"><h2 className="truncate text-xl font-black">{displayName}</h2><p className="mt-0.5 truncate text-xs text-neutral-500">{user.email}</p></div>
        </section>

        <section className="gc-list-panel">
          <Link href="/profile/settings" className="gc-list-row"><Settings className="h-4 w-4 text-indigo-300" /><span className="min-w-0 flex-1 font-bold">الحساب</span><ArrowUpLeft className="h-4 w-4 text-neutral-600" /></Link>
          <Link href="/progress/gain" className="gc-list-row"><Sparkles className="h-4 w-4 text-emerald-300" /><span className="min-w-0 flex-1 font-bold">Gain Mode</span><span className="gc-mini-badge">GOAL</span><ArrowUpLeft className="h-4 w-4 text-neutral-600" /></Link>
          <Link href="/progress/body" className="gc-list-row"><Scale className="h-4 w-4 text-emerald-300" /><span className="min-w-0 flex-1 font-bold">الجسم والوزن</span><ArrowUpLeft className="h-4 w-4 text-neutral-600" /></Link>
          <Link href="/split/personal" className="gc-list-row"><Dumbbell className="h-4 w-4 text-neutral-400" /><span className="min-w-0 flex-1 font-bold">جدول التمرين</span><ArrowUpLeft className="h-4 w-4 text-neutral-600" /></Link>
          <Link href="/group" className="gc-list-row"><Users className="h-4 w-4 text-neutral-400" /><span className="min-w-0 flex-1 font-bold">Crew</span><span className="text-[10px] font-bold text-neutral-600">اختياري</span><ArrowUpLeft className="h-4 w-4 text-neutral-600" /></Link>
        </section>

        <section>
          <h3 className="mb-2 px-1 text-sm font-black">التطبيق</h3>
          <div className="grid gap-2 sm:grid-cols-2"><LanguageSwitcher variant="panel" /><ThemeSwitcher variant="panel" /></div>
        </section>
      </PageContainer>
    </>
  );
}
