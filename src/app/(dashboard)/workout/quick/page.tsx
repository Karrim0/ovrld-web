import { Suspense } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { QuickWorkoutLogClient } from "@/features/workouts/components/QuickWorkoutLogClient";

export default function QuickWorkoutLogPage() {
  return (
    <PageContainer className="gc-gym-page px-3 pb-6 min-[380px]:px-4 sm:px-5">
      <Suspense fallback={<p className="py-10 text-center text-sm text-neutral-500">Loading…</p>}>
        <QuickWorkoutLogClient />
      </Suspense>
    </PageContainer>
  );
}
