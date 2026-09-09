import Link from "next/link";
import { ArrowUpLeft, CalendarDays, Clock3, Dumbbell, History, ListChecks } from "lucide-react";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { PageContainer } from "@/components/layout/PageContainer";

export default function WorkoutPage() {
  return (
    <>
      <DashboardHeader title="التمرين" />
      <PageContainer className="space-y-4 pb-8 pt-5">
        <Link
          href="/workout/today"
          className="gc-hero-card relative block overflow-hidden rounded-[30px] p-5 sm:p-7"
        >
          <div className="absolute -right-10 -top-12 h-40 w-40 rounded-full bg-emerald-300/10 blur-3xl" />
          <div className="relative flex items-start gap-4">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-[20px] bg-emerald-300 text-neutral-950">
              <Dumbbell className="h-7 w-7" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="gc-eyebrow">وضع الجيم</span>
              <span className="mt-1 block text-2xl font-bold tracking-[-0.035em] sm:text-3xl">تمرينة النهارده</span>
              <span className="mt-2 block max-w-xl text-sm leading-6 text-neutral-400">افتح جدولك وسجّل السِتات بإيد واحدة وخلي تايمر الراحة شغال معاك.</span>
            </span>
            <ArrowUpLeft className="h-5 w-5 text-emerald-300" />
          </div>
        </Link>

        <div className="grid gap-3 sm:grid-cols-2">
          <Link href="/workout/active" className="gc-card-interactive flex items-center gap-3 p-4">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-300/10 text-emerald-300"><Clock3 className="h-5 w-5" /></span>
            <span className="min-w-0 flex-1"><span className="block font-bold">تمرينة شغالة</span><span className="block text-sm text-neutral-500">كمّل من مكان ما وقفت</span></span>
            <ArrowUpLeft className="h-4 w-4 text-neutral-600" />
          </Link>
          <Link href="/workout/history" className="gc-card-interactive flex items-center gap-3 p-4">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/[0.05] text-neutral-300"><History className="h-5 w-5" /></span>
            <span className="min-w-0 flex-1"><span className="block font-bold">سجل التمارين</span><span className="block text-sm text-neutral-500">راجع السِتات والملاحظات</span></span>
            <ArrowUpLeft className="h-4 w-4 text-neutral-600" />
          </Link>
          <Link href="/split/personal" className="gc-card-interactive flex items-center gap-3 p-4">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/[0.05] text-neutral-300"><ListChecks className="h-5 w-5" /></span>
            <span className="min-w-0 flex-1"><span className="block font-bold">جدولك الشخصي</span><span className="block text-sm text-neutral-500">التمارين وأيام الراحة</span></span>
            <ArrowUpLeft className="h-4 w-4 text-neutral-600" />
          </Link>
          <div className="gc-card flex items-center gap-3 p-4 opacity-60">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/[0.05] text-neutral-400"><CalendarDays className="h-5 w-5" /></span>
            <span><span className="block font-bold">تقويم التمرين</span><span className="block text-sm text-neutral-500">قريب في تحديث جاي</span></span>
          </div>
        </div>
      </PageContainer>
    </>
  );
}
