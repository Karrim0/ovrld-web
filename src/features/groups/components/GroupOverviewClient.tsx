"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Activity, ArrowUpLeft, Settings2, ShieldCheck, Users } from "lucide-react";
import type { GroupRole, UUID, WorkoutGroup } from "@/types";
import { groupRoleLabelAr } from "@/lib/localization";
import { GroupInviteCode } from "./GroupInviteCode";
import { GroupSplitUpdateCard } from "./GroupSplitUpdateCard";
import { WeeklyLeaderboard } from "./WeeklyLeaderboard";
import { GroupActivityFeedClient } from "./GroupActivityFeedClient";
import { fetchGroupMembers } from "../services/group.service";

interface GroupOverviewClientProps {
  group: WorkoutGroup;
  role: GroupRole;
  currentUserId: UUID;
}

export function GroupOverviewClient({ group, role, currentUserId }: GroupOverviewClientProps) {
  const [memberCount, setMemberCount] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    void fetchGroupMembers(group.id)
      .then((أعضاء) => { if (active) setMemberCount(أعضاء.length); })
      .catch(() => { if (active) setMemberCount(null); });
    return () => { active = false; };
  }, [group.id]);

  if (group.isPersonal) {
    return (
      <div className="space-y-4 pb-8 pt-4">
        <section className="gc-card p-5 sm:p-6">
          <p className="gc-eyebrow">مساحتك الشخصية</p>
          <h2 className="mt-2 text-2xl font-bold">{group.name}</h2>
          <p className="mt-2 text-sm leading-6 text-neutral-500">المساحة دي لجدولك وإحصائياتك الخاصة. أدوات الجروب هتظهر لما تدخل جروب حقيقي.</p>
          <Link href="/split/personal" className="gc-primary-button mt-5">افتح جدولك الشخصي <ArrowUpLeft className="h-4 w-4" /></Link>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-8 pt-4">
      <section className="gc-card p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-emerald-300/10 text-emerald-200"><Users className="h-6 w-6" /></span>
          <div className="min-w-0 flex-1">
            <p className="gc-eyebrow">الجروب بتاعك</p>
            <h2 className="mt-1 truncate text-2xl font-bold tracking-[-0.025em]">{group.name}</h2>
            <div className="mt-3 flex flex-wrap gap-2"><span className="gc-chip"><ShieldCheck className="h-3.5 w-3.5 text-emerald-200" /> {groupRoleLabelAr(role)}</span><span className="gc-chip"><Users className="h-3.5 w-3.5 text-emerald-200" /> {memberCount ?? "—"} أعضاء</span></div>
          </div>
        </div>
      </section>

      <GroupSplitUpdateCard userId={currentUserId} />

      <section className="gc-card p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div><p className="gc-eyebrow">دعوة</p><h3 className="mt-1 font-bold">دخل حد معاكم في الجروب</h3></div>
          <Link href="/group/members" className="text-xs font-semibold text-emerald-200">إدارة الأعضاء</Link>
        </div>
        <div className="mt-3"><GroupInviteCode inviteCode={group.inviteCode} /></div>
      </section>

      <section>
        <div className="mb-3 flex items-end justify-between gap-3"><div><p className="gc-eyebrow">الأسبوع ده</p><h3 className="mt-1 text-xl font-bold">الترتيب</h3></div><Link href="/group/activity" className="text-xs font-semibold text-emerald-200">كل النشاط</Link></div>
        <WeeklyLeaderboard groupId={group.id} compact />
      </section>

      <section>
        <div className="mb-3"><p className="gc-eyebrow">آخر نشاط</p><h3 className="mt-1 text-xl font-bold">نشاط الجروب</h3><p className="mt-1 text-sm text-neutral-500">بس الملخصات اللي كل عضو اختار يشاركها.</p></div>
        <GroupActivityFeedClient groupId={group.id} />
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <Link href="/group/members" className="gc-card-interactive flex items-center gap-3 p-4"><span className="grid h-10 w-10 place-items-center rounded-xl bg-white/[0.045] text-emerald-200"><Users className="h-5 w-5" /></span><span className="min-w-0 flex-1"><span className="block font-semibold">الأعضاء</span><span className="block text-xs text-neutral-500">الصلاحيات والإحصائيات</span></span><ArrowUpLeft className="h-4 w-4 text-neutral-600" /></Link>
        <Link href="/split/group" className="gc-card-interactive flex items-center gap-3 p-4"><span className="grid h-10 w-10 place-items-center rounded-xl bg-white/[0.045] text-emerald-200"><ShieldCheck className="h-5 w-5" /></span><span className="min-w-0 flex-1"><span className="block font-semibold">جدول الجروب</span><span className="block text-xs text-neutral-500">الجدول المشترك</span></span><ArrowUpLeft className="h-4 w-4 text-neutral-600" /></Link>
        <Link href="/group/settings" className="gc-card-interactive flex items-center gap-3 p-4"><span className="grid h-10 w-10 place-items-center rounded-xl bg-white/[0.045] text-emerald-200"><Settings2 className="h-5 w-5" /></span><span className="min-w-0 flex-1"><span className="block font-semibold">الخصوصية</span><span className="block text-xs text-neutral-500">صحابك يقدروا يشوفوا إيه</span></span><ArrowUpLeft className="h-4 w-4 text-neutral-600" /></Link>
      </section>

      <Link href="/group/activity" className="gc-secondary-button w-full"><Activity className="h-4 w-4" /> افتح كل نشاط الجروب</Link>
    </div>
  );
}
