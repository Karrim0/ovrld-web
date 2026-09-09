"use client";

import { useEffect, useState } from "react";
import { RefreshCw, ShieldCheck } from "lucide-react";
import { resetPersonalSplitToGroup } from "@/features/splits/services/split.service";
import type { UUID } from "@/types";
import { acknowledgeGroupSplitUpdate, fetchGroupSplitSyncStatus } from "../services/group.service";
import type { GroupSplitSyncStatus } from "../types";

export function GroupSplitUpdateCard({ userId }: { userId: UUID }) {
  const [status, setStatus] = useState<GroupSplitSyncStatus | null>(null);
  const [busy, setBusy] = useState<"apply" | "keep" | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => { fetchGroupSplitSyncStatus(userId).then(setStatus); }, [userId]);
  if (!status?.hasUpdate) return null;

  async function keepPersonal() {
    setBusy("keep");
    try {
      await acknowledgeGroupSplitUpdate(status!.groupId);
      setMessage("جدولك الشخصي زي ما هو.");
      setStatus((current) => current ? { ...current, hasUpdate: false, seenVersion: current.groupVersion } : current);
    } finally { setBusy(null); }
  }

  async function applyGroup() {
    setBusy("apply");
    try {
      await resetPersonalSplitToGroup(userId);
      await acknowledgeGroupSplitUpdate(status!.groupId);
      setMessage("آخر جدول للجروب اتنسخ لجدولك الشخصي.");
      setStatus((current) => current ? { ...current, hasUpdate: false, seenVersion: current.groupVersion } : current);
    } finally { setBusy(null); }
  }

  if (message) return <p className="rounded-2xl border border-emerald-500/30 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200">{message}</p>;

  return (
    <section className="rounded-[26px] border border-amber-400/50 bg-amber-50 p-4 dark:bg-amber-950/20">
      <div className="flex gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-amber-400 text-neutral-950"><RefreshCw className="h-5 w-5" /></span><div><h3 className="font-bold">جدول الجروب اتحدّث</h3><p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">اختار تنسخه لجدولك الشخصي ولا لأ. جدولك عمره ما هيتغير من غير إذنك.</p></div></div>
      <div className="mt-4 grid grid-cols-2 gap-2"><button type="button" disabled={busy !== null} onClick={() => void keepPersonal()} className="rounded-xl border px-3 py-3 text-sm font-bold">خلي جدولي</button><button type="button" disabled={busy !== null} onClick={() => void applyGroup()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-300 px-3 py-3 text-sm font-bold text-neutral-950"><ShieldCheck className="h-4 w-4" />استخدم جدول الجروب</button></div>
    </section>
  );
}
