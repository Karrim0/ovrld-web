"use client";

import { Bell, BellOff, Minus, Pause, Play, Plus, RotateCcw, TimerReset, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useRestTimer } from "@/contexts/rest-timer-context";
import { useVirtualKeyboard } from "@/hooks/use-virtual-keyboard";
import { formatDuration } from "@/lib/utils/format";

const PRESETS = [60, 90, 120, 180] as const;

export function RestTimerPanel() {
  const timer = useRestTimer();
  if (!timer.isOpen) return null;

  const remainingRatio = timer.durationSeconds > 0
    ? Math.max(0, Math.min(1, timer.remainingSeconds / timer.durationSeconds))
    : 0;
  const radius = 82;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="gc-modal-backdrop fixed inset-0 z-[80] flex items-end overflow-y-auto p-2 pb-[max(.5rem,env(safe-area-inset-bottom,0px))] sm:items-center sm:justify-center sm:p-3" role="dialog" aria-modal="true" aria-label="تايمر الراحة">
      <section className="gc-timer-card max-h-[calc(100vh-1rem)] max-h-[calc(100svh-1rem)] w-full max-w-md overflow-y-auto rounded-[24px] min-[380px]:rounded-[30px]">
        <div className="flex min-w-0 items-start justify-between gap-3 px-4 pt-5 min-[380px]:px-5">
          <div className="min-w-0">
            <p className="gc-eyebrow">تايمر الراحة</p>
            <h2 className="mt-1 text-lg font-bold leading-7 min-[380px]:text-xl">خد نفسك وادخل السِت اللي جاية جاهز.</h2>
          </div>
          <button type="button" onClick={timer.close} className="gc-icon-button rounded-full" aria-label="اقفل تايمر الراحة"><X className="h-5 w-5" /></button>
        </div>

        <div className="px-3 py-4 text-center min-[380px]:px-5 min-[380px]:py-6">
          <div className="relative mx-auto grid h-44 w-44 place-items-center min-[380px]:h-52 min-[380px]:w-52">
            <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 200 200" aria-hidden>
              <circle className="gc-timer-ring-track" cx="100" cy="100" r={radius} fill="none" strokeWidth="12" />
              <circle
                className="gc-timer-ring-progress transition-[stroke-dashoffset] duration-300"
                cx="100"
                cy="100"
                r={radius}
                fill="none"
                strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={circumference * (1 - remainingRatio)}
              />
            </svg>
            <div>
              <p className="gc-timer-digits font-mono text-4xl font-bold tracking-[-0.05em] min-[380px]:text-5xl">{formatDuration(timer.remainingSeconds)}</p>
              <p className="gc-muted mt-2 text-sm font-semibold">
                {timer.completedAt && timer.remainingSeconds === 0
                  ? "الراحة خلصت · السِت اللي جاية جاهزة"
                  : timer.isRunning ? "خد نفسك وركّز" : "ابدأ لما السِت تخلص"}
              </p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-4 gap-1.5 min-[380px]:gap-2">
            {PRESETS.map((seconds) => (
              <button
                key={seconds}
                type="button"
                onClick={() => timer.setDuration(seconds)}
                className={`gc-timer-preset ${timer.durationSeconds === seconds ? "gc-timer-preset-active" : ""}`}
              >
                {seconds < 120 ? `${seconds} ث` : `${seconds / 60} د`}
              </button>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-center gap-2 min-[380px]:gap-3">
            <button type="button" onClick={() => timer.addTime(-15)} className="gc-timer-adjust"><Minus className="h-4 w-4" /> 15 ث</button>
            <button type="button" onClick={timer.isRunning ? timer.pause : () => timer.start()} className="gc-timer-play" aria-label={timer.isRunning ? "وقّف تايمر الراحة" : "شغّل تايمر الراحة"}>
              {timer.isRunning ? <Pause className="h-7 w-7" /> : <Play className="ms-1 h-7 w-7" />}
            </button>
            <button type="button" onClick={() => timer.addTime(15)} className="gc-timer-adjust"><Plus className="h-4 w-4" /> 15 ث</button>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2">
            <button type="button" onClick={timer.reset} className="gc-secondary-button"><RotateCcw className="h-4 w-4" /> ابدأ من الأول</button>
            <button type="button" onClick={timer.skip} className="gc-secondary-button">عدّي الراحة</button>
          </div>

          <div className="gc-timer-sound mt-4 flex min-w-0 items-center justify-between gap-3 p-3 text-start">
            <div className="flex min-w-0 items-center gap-3">
              <span className="gc-settings-icon h-9 w-9">{timer.soundEnabled ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}</span>
              <div className="min-w-0"><p className="truncate text-sm font-bold">صوت انتهاء الراحة</p><button type="button" onClick={timer.testSound} className="text-xs font-semibold text-emerald-600 dark:text-emerald-200">جرّب الصوت</button></div>
            </div>
            <button type="button" role="switch" aria-checked={timer.soundEnabled} onClick={() => timer.setSoundEnabled(!timer.soundEnabled)} className={`gc-switch ${timer.soundEnabled ? "gc-switch-active" : ""}`}>
              <span className="gc-switch-thumb" />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

export function RestTimerLauncher() {
  const timer = useRestTimer();
  const pathname = usePathname();
  const keyboardOpen = useVirtualKeyboard();
  if (!timer.scopeId || keyboardOpen) return null;

  const activeWorkout = pathname.startsWith("/workout/active");
  const active = timer.isRunning || timer.remainingSeconds !== timer.durationSeconds;

  return (
    <>
      <button
        type="button"
        onClick={timer.open}
        className={`gc-timer-launcher fixed z-50 flex min-h-14 max-w-[calc(100vw-1.5rem)] items-center gap-3 rounded-2xl px-4 transition ${activeWorkout ? "bottom-3" : "bottom-[5.35rem] md:bottom-6"} ${timer.isRunning ? "gc-timer-launcher-running" : ""}`}
        aria-label="افتح تايمر الراحة"
      >
        <span className="gc-settings-icon h-9 w-9"><TimerReset className={`h-5 w-5 ${timer.isRunning ? "animate-pulse" : ""}`} /></span>
        <span className="text-start"><span className="block text-[9px] font-bold uppercase tracking-[0.14em] opacity-60">{timer.isRunning ? "وقت الراحة" : "تايمر الراحة"}</span><span className="block font-mono text-base font-bold tabular-nums">{active ? formatDuration(timer.remainingSeconds) : "جاهز"}</span></span>
      </button>
      <RestTimerPanel />
    </>
  );
}
