import type { ReactNode } from "react";
import { ShieldCheck, WifiOff } from "lucide-react";
import { LanguageSwitcher } from "@/components/localization/LanguageSwitcher";
import { ThemeSwitcher } from "@/components/theme/ThemeSwitcher";
import { BrandMark } from "@/components/brand/BrandMark";

export interface AuthShellProps {
  children: ReactNode;
}

export function AuthShell({ children }: AuthShellProps) {
  return (
    <main className="gc-auth-shell relative flex min-h-dvh items-center justify-center overflow-hidden px-3 py-6 sm:px-6 sm:py-8">
      <div className="gc-auth-toolbar absolute top-3 z-20 flex items-center gap-2 sm:top-6">
        <ThemeSwitcher />
        <LanguageSwitcher />
      </div>

      <div className="gc-auth-glow absolute inset-0 -z-10" />

      <div className="gc-auth-card grid w-full max-w-5xl overflow-hidden rounded-[26px] sm:rounded-[32px] lg:grid-cols-[1.05fr_.95fr]">
        <section className="gc-auth-promo hidden min-h-[640px] flex-col justify-between p-10 lg:flex">
          <div>
            <div className="flex items-center gap-3">
              <span className="gc-brand-mark grid h-12 w-12 place-items-center rounded-2xl">
                <BrandMark className="h-7 w-7" />
              </span>
              <p className="gc-eyebrow">TRAIN · LOG · PROGRESS</p>
            </div>
            <h2 className="mt-20 max-w-md text-5xl font-bold leading-[1.02] tracking-[-0.055em]">
              تمرينك وأرقامك، من غير زحمة.
            </h2>
            <p className="gc-muted mt-5 max-w-lg text-base leading-7">
              جدول واضح، تسجيل سريع، وتقدم مبني على اللي بتعمله فعلًا.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="gc-auth-feature p-4">
              <WifiOff className="h-5 w-5 text-indigo-500 dark:text-indigo-300" />
              <p className="mt-3 font-bold">شغال من غير نت</p>
              <p className="gc-muted mt-1 text-xs leading-5">كمّل تسجيل حتى لو نت الجيم ضعيف.</p>
            </div>
            <div className="gc-auth-feature p-4">
              <ShieldCheck className="h-5 w-5 text-indigo-500 dark:text-indigo-300" />
              <p className="mt-3 font-bold">خصوصيتك محفوظة</p>
              <p className="gc-muted mt-1 text-xs leading-5">إنت اللي بتحدد الجروب يشوف إيه.</p>
            </div>
          </div>
        </section>

        <section className="flex min-h-[560px] items-center p-5 sm:min-h-[600px] sm:p-8 lg:p-10">
          <div className="mx-auto w-full min-w-0 max-w-md">
            <div className="mb-8 flex items-center gap-3 lg:hidden">
              <span className="gc-brand-mark grid h-11 w-11 place-items-center rounded-2xl">
                <BrandMark className="h-6 w-6" />
              </span>
              <p className="gc-muted min-w-0 truncate text-xs font-black uppercase tracking-[0.16em]">TRAIN · LOG · PROGRESS</p>
            </div>
            {children}
          </div>
        </section>
      </div>
    </main>
  );
}
