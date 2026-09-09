import Link from "next/link";
import { ArrowRight, SearchX } from "lucide-react";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh items-center justify-center p-4 text-center">
      <section className="gc-card w-full max-w-md p-7">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-[22px] bg-emerald-300/10 text-emerald-300"><SearchX className="h-8 w-8" /></span>
        <p className="gc-eyebrow mt-5">404</p>
        <h1 className="mt-2 text-3xl font-bold tracking-[-0.04em]">الصفحة دي مش موجودة</h1>
        <p className="mt-2 text-sm leading-6 text-neutral-500">الصفحة دي مش موجودة أو مكانها اتغيّر.</p>
        <Link href="/dashboard" className="gc-primary-button mt-6 w-full"><ArrowRight className="h-4 w-4" /> ارجع للرئيسية</Link>
      </section>
    </main>
  );
}
