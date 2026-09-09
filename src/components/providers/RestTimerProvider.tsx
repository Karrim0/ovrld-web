/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { RestTimerContext, type RestTimerContextValue } from "@/contexts/rest-timer-context";
import { STORAGE_KEYS, readCompatibleStorage } from "@/config/storage";

interface RestTimerProviderProps { children: ReactNode }
interface PersistedTimer { durationSeconds: number; remainingSeconds: number; isRunning: boolean; endsAt: number | null; completedAt: string | null }

const STORAGE_PREFIX = STORAGE_KEYS.restTimerPrefix;
const LEGACY_STORAGE_PREFIX = STORAGE_KEYS.legacyRestTimerPrefix;
const SOUND_STORAGE_KEY = `${STORAGE_PREFIX}:sound`;
const LEGACY_SOUND_STORAGE_KEY = `${LEGACY_STORAGE_PREFIX}:sound`;
const REST_HAPTICS_STORAGE_KEY = STORAGE_KEYS.restHaptics;
const LEGACY_REST_HAPTICS_STORAGE_KEY = STORAGE_KEYS.legacyRestHaptics;
const DEFAULT_DURATION = 90;

function clampDuration(seconds: number) { return Math.min(15 * 60, Math.max(15, Math.floor(seconds))); }
function storageKey(scopeId: string) { return `${STORAGE_PREFIX}:${scopeId}`; }
function legacyStorageKey(scopeId: string) { return `${LEGACY_STORAGE_PREFIX}:${scopeId}`; }

export function RestTimerProvider({ children }: RestTimerProviderProps) {
  const [scopeId, setScopeId] = useState<string | null>(null);
  const [durationSeconds, setDurationSeconds] = useState(DEFAULT_DURATION);
  const [remainingSeconds, setRemainingSeconds] = useState(DEFAULT_DURATION);
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [completedAt, setCompletedAt] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [soundEnabled, setSoundEnabledState] = useState(true);
  const [hapticsEnabled, setHapticsEnabledState] = useState(true);
  const audioContextRef = useRef<AudioContext | null>(null);

  const getAudioContext = useCallback(() => {
    if (typeof window === "undefined") return null;
    const AudioContextClass = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return null;
    audioContextRef.current ??= new AudioContextClass();
    return audioContextRef.current;
  }, []);

  const unlockAudio = useCallback(() => {
    const context = getAudioContext();
    if (context?.state === "suspended") void context.resume();
  }, [getAudioContext]);

  const playCompletionSound = useCallback(() => {
    if (!soundEnabled) return;
    const context = getAudioContext();
    if (!context || context.state !== "running") return;
    const now = context.currentTime;
    [659.25, 783.99, 987.77].forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      const startsAt = now + index * 0.14;
      gain.gain.setValueAtTime(0.0001, startsAt);
      gain.gain.exponentialRampToValueAtTime(0.16, startsAt + 0.018);
      gain.gain.exponentialRampToValueAtTime(0.0001, startsAt + 0.19);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(startsAt);
      oscillator.stop(startsAt + 0.2);
    });
  }, [getAudioContext, soundEnabled]);

  const resetState = useCallback(() => {
    setDurationSeconds(DEFAULT_DURATION);
    setRemainingSeconds(DEFAULT_DURATION);
    setEndsAt(null);
    setIsRunning(false);
    setCompletedAt(null);
    setIsOpen(false);
  }, []);

  useEffect(() => {
    setSoundEnabledState(readCompatibleStorage(SOUND_STORAGE_KEY, LEGACY_SOUND_STORAGE_KEY) !== "off");
    setHapticsEnabledState(readCompatibleStorage(REST_HAPTICS_STORAGE_KEY, LEGACY_REST_HAPTICS_STORAGE_KEY) !== "off");
  }, []);

  useEffect(() => {
    setHydrated(false);
    if (!scopeId) { resetState(); setHydrated(true); return; }
    const raw = readCompatibleStorage(storageKey(scopeId), legacyStorageKey(scopeId));
    if (!raw) { resetState(); setHydrated(true); return; }
    try {
      const stored = JSON.parse(raw) as PersistedTimer;
      const nextRemaining = stored.isRunning && stored.endsAt ? Math.max(0, Math.ceil((stored.endsAt - Date.now()) / 1000)) : stored.remainingSeconds;
      setDurationSeconds(clampDuration(stored.durationSeconds));
      setRemainingSeconds(Math.max(0, nextRemaining));
      setEndsAt(stored.isRunning && nextRemaining > 0 ? stored.endsAt : null);
      setIsRunning(stored.isRunning && nextRemaining > 0);
      setCompletedAt(nextRemaining === 0 ? stored.completedAt ?? new Date().toISOString() : stored.completedAt);
    } catch { window.localStorage.removeItem(storageKey(scopeId)); resetState(); }
    setHydrated(true);
  }, [resetState, scopeId]);

  useEffect(() => {
    if (!hydrated || !scopeId) return;
    window.localStorage.setItem(storageKey(scopeId), JSON.stringify({ durationSeconds, remainingSeconds, isRunning, endsAt, completedAt } satisfies PersistedTimer));
  }, [completedAt, durationSeconds, endsAt, hydrated, isRunning, remainingSeconds, scopeId]);

  useEffect(() => {
    if (!isRunning || !endsAt) return;
    const tick = () => {
      const next = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
      setRemainingSeconds(next);
      if (next === 0) {
        setIsRunning(false);
        setEndsAt(null);
        setCompletedAt(new Date().toISOString());
        setIsOpen(true);
        playCompletionSound();
        if (hapticsEnabled && "vibrate" in navigator) navigator.vibrate([280, 100, 180, 100, 280]);
      }
    };
    tick();
    const interval = window.setInterval(tick, 250);
    return () => window.clearInterval(interval);
  }, [endsAt, hapticsEnabled, isRunning, playCompletionSound]);

  const setScope = useCallback((nextScopeId: string | null) => setScopeId(nextScopeId), []);
  const setDuration = useCallback((seconds: number) => { const safe = clampDuration(seconds); setDurationSeconds(safe); setRemainingSeconds(safe); setEndsAt(null); setIsRunning(false); setCompletedAt(null); }, []);
  const start = useCallback((seconds?: number) => { unlockAudio(); const nextDuration = seconds ? clampDuration(seconds) : durationSeconds; const nextRemaining = seconds ? nextDuration : remainingSeconds > 0 ? remainingSeconds : nextDuration; setDurationSeconds(nextDuration); setRemainingSeconds(nextRemaining); setEndsAt(Date.now() + nextRemaining * 1000); setIsRunning(true); setCompletedAt(null); }, [durationSeconds, remainingSeconds, unlockAudio]);
  const pause = useCallback(() => { if (endsAt) setRemainingSeconds(Math.max(0, Math.ceil((endsAt - Date.now()) / 1000))); setEndsAt(null); setIsRunning(false); }, [endsAt]);
  const reset = useCallback(() => { setRemainingSeconds(durationSeconds); setEndsAt(null); setIsRunning(false); setCompletedAt(null); }, [durationSeconds]);
  const skip = useCallback(() => { setRemainingSeconds(0); setEndsAt(null); setIsRunning(false); setCompletedAt(new Date().toISOString()); setIsOpen(false); }, []);
  const clear = useCallback(() => { if (scopeId) window.localStorage.removeItem(storageKey(scopeId)); resetState(); }, [resetState, scopeId]);
  const addTime = useCallback((seconds: number) => { setCompletedAt(null); if (isRunning && endsAt) { const nextEnd = Math.max(Date.now(), endsAt + seconds * 1000); setEndsAt(nextEnd); setRemainingSeconds(Math.max(0, Math.ceil((nextEnd - Date.now()) / 1000))); return; } setRemainingSeconds((current) => Math.max(0, Math.min(15 * 60, current + seconds))); }, [endsAt, isRunning]);
  const setSoundEnabled = useCallback((enabled: boolean) => { setSoundEnabledState(enabled); window.localStorage.setItem(SOUND_STORAGE_KEY, enabled ? "on" : "off"); if (enabled) unlockAudio(); }, [unlockAudio]);
  const setHapticsEnabled = useCallback((enabled: boolean) => { setHapticsEnabledState(enabled); window.localStorage.setItem(REST_HAPTICS_STORAGE_KEY, enabled ? "on" : "off"); }, []);
  const testSound = useCallback(() => { unlockAudio(); window.setTimeout(playCompletionSound, 60); }, [playCompletionSound, unlockAudio]);
  const testHaptics = useCallback(() => { if (hapticsEnabled && "vibrate" in navigator) navigator.vibrate([80, 50, 120]); }, [hapticsEnabled]);

  const value = useMemo<RestTimerContextValue>(() => ({
    scopeId, durationSeconds, remainingSeconds, isRunning, isOpen, completedAt, soundEnabled, hapticsEnabled,
    setScope, open: () => setIsOpen(true), close: () => setIsOpen(false), setDuration, start, pause, reset, skip, clear, addTime, setSoundEnabled, setHapticsEnabled, testSound, testHaptics,
  }), [addTime, clear, completedAt, durationSeconds, hapticsEnabled, isOpen, isRunning, pause, remainingSeconds, reset, scopeId, setDuration, setHapticsEnabled, setScope, setSoundEnabled, skip, soundEnabled, start, testHaptics, testSound]);

  return <RestTimerContext value={value}>{children}</RestTimerContext>;
}
