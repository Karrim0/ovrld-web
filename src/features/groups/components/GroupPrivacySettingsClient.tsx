"use client";

import { getArabicErrorMessage } from "@/lib/localization";
import { useEffect, useState } from "react";
import { Eye, EyeOff, Save } from "lucide-react";
import { fetchProfile, updateSharingPreferences } from "@/features/profile/services/profile.service";
import type { UUID } from "@/types";

function Toggle({ checked, onChange, title, description }: { checked: boolean; onChange: (value: boolean) => void; title: string; description: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-2xl border p-4">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="mt-1 h-5 w-5 accent-emerald-500" />
      <span className="flex-1"><span className="block font-bold">{title}</span><span className="mt-1 block text-sm text-neutral-500">{description}</span></span>
      {checked ? <Eye className="h-5 w-5 text-emerald-500" /> : <EyeOff className="h-5 w-5 text-neutral-400" />}
    </label>
  );
}

export function GroupPrivacySettingsClient({ userId }: { userId: UUID }) {
  const [summary, setSummary] = useState(true);
  const [records, setRecords] = useState(true);
  const [weights, setWeights] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchProfile(userId).then((profile) => {
      if (!profile) return;
      setSummary(profile.shareWorkoutSummary);
      setRecords(profile.sharePersonalRecords);
      setWeights(profile.shareWeights);
    }).finally(() => setLoading(false));
  }, [userId]);

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      await updateSharingPreferences(userId, { shareWorkoutSummary: summary, sharePersonalRecords: records, shareWeights: weights });
      setMessage("إعدادات المشاركة اتحفظت.");
    } catch (caught) {
      setMessage(getArabicErrorMessage(caught, "معرفناش نحفظ الإعدادات."));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="h-72 animate-pulse rounded-[26px] bg-neutral-100 dark:bg-neutral-900" />;

  return (
    <div className="space-y-4">
      <section className="gc-hero-card rounded-[26px] p-5"><p className="text-xs font-bold uppercase tracking-[0.15em] opacity-60">بياناتك وإنت حر فيها</p><h2 className="mt-2 text-2xl font-bold">خصوصية الجروب</h2><p className="mt-2 text-sm opacity-70">سجل تمارينك الكامل بيفضل خاص. الإعدادات دي بتحدد الملخصات البسيطة اللي تظهر لصحابك.</p></section>
      <Toggle checked={summary} onChange={setSummary} title="ملخصات التمرينات" description="خلّي الجروب يشوف التمرينات المكتملة وعدد تمرينات الأسبوع والالتزام." />
      <Toggle checked={records} onChange={setRecords} title="أرقامك القياسية" description="اظهر لما تكسر رقم وعدد أرقامك الإجمالي." />
      <Toggle checked={weights} onChange={setWeights} title="قيم الأرقام" description="اظهر الوزن أو عدد العدات الحقيقي في نشاط الأرقام. مقفول افتراضيًا." />
      {message ? <p className="rounded-xl bg-neutral-100 p-3 text-sm dark:bg-neutral-900">{message}</p> : null}
      <button type="button" disabled={saving} onClick={() => void save()} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-300 px-4 py-3 font-bold text-neutral-950 disabled:opacity-50"><Save className="h-5 w-5" />{saving ? "بنحفظ…" : "احفظ إعدادات الخصوصية"}</button>
    </div>
  );
}
