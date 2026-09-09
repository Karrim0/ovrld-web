import type { ReactNode } from "react";
import { BackButton } from "@/components/navigation/BackButton";
import { BrandMark } from "@/components/brand/BrandMark";
import { SyncStatusIndicator } from "@/components/feedback/SyncStatusIndicator";
import { ProfileAvatarLink } from "@/components/layout/ProfileAvatarLink";
import { LanguageSwitcher } from "@/components/localization/LanguageSwitcher";
import { LocalizedText } from "@/components/localization/LocalizedText";
import { ThemeSwitcher } from "@/components/theme/ThemeSwitcher";
import { getCurrentUser } from "@/features/auth/services/auth.server";
import { createClient } from "@/lib/supabase/server";

export interface DashboardHeaderProps {
  title: string;
  showBackButton?: boolean;
  actions?: ReactNode;
  showProfile?: boolean;
}

interface HeaderProfile {
  avatarUrl: string | null;
  displayName: string;
}

async function getHeaderProfile(): Promise<HeaderProfile> {
  const user = await getCurrentUser();
  const fallbackName = user?.email?.split("@")[0] ?? "لاعب";

  if (!user) return { avatarUrl: null, displayName: fallbackName };

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("display_name, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  return {
    avatarUrl: data?.avatar_url ?? null,
    displayName: data?.display_name?.trim() || fallbackName,
  };
}

export async function DashboardHeader({ title, showBackButton, actions, showProfile = true }: DashboardHeaderProps) {
  const profile = showProfile ? await getHeaderProfile() : null;

  return (
    <header className="gc-topbar sticky top-0 z-30 px-3 py-3 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-6xl min-w-0 items-center justify-between gap-2.5">
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          {showBackButton ? <BackButton /> : <span className="gc-header-brand" aria-hidden><BrandMark className="h-5 w-5" /></span>}
          <h1 className="min-w-0 truncate text-lg font-bold tracking-[-0.015em] sm:text-xl"><LocalizedText>{title}</LocalizedText></h1>
        </div>
        <div className="gc-header-actions flex shrink-0 items-center gap-1.5 sm:gap-2">
          {actions}
          <span className="hidden lg:inline-flex"><ThemeSwitcher /></span>
          <span className="hidden lg:inline-flex"><LanguageSwitcher /></span>
          <SyncStatusIndicator />
          {profile ? <ProfileAvatarLink avatarUrl={profile.avatarUrl} displayName={profile.displayName} /> : null}
        </div>
      </div>
    </header>
  );
}
