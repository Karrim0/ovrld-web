import fs from 'node:fs';

const checks = [
  ['home has Log Data CTA', 'src/features/dashboard/components/HomeLogDataAction.tsx', 'Log Data'],
  ['dashboard uses Log Data action', 'src/app/(dashboard)/dashboard/page.tsx', 'HomeLogDataAction'],
  ['home prioritizes train', 'src/features/workouts/components/TodaysWorkoutClient.tsx', 'gc-home-train-card'],
  ['active workout nav hidden by shell', 'src/components/navigation/BottomNavigation.tsx', 'pathname.startsWith("/workout/active")'],
  ['game mode uses workout title', 'src/features/workouts/components/ActiveWorkoutClient.tsx', 'workoutTitle'],
  ['game mode shows exercise progress', 'src/features/workouts/components/ActiveWorkoutClient.tsx', 'Exercise ${currentIndex + 1} of'],
  ['auto-fill previous set values', 'src/features/workouts/components/ActiveWorkoutClient.tsx', 'previous?.weightKg?.toString()'],
  ['complete set CTA', 'src/features/workouts/components/ActiveWorkoutClient.tsx', 'Complete Set'],
  ['undo support', 'src/features/workouts/components/ActiveWorkoutClient.tsx', 'undoLastSet'],
  ['warm-up support', 'src/features/workouts/components/ActiveWorkoutClient.tsx', 'isWarmup'],
  ['optional RIR support', 'src/features/workouts/components/ActiveWorkoutClient.tsx', 'RIR / Failure'],
  ['rest timer 5 minute preset', 'src/features/workouts/components/RestTimerPanel.tsx', '300'],
  ['rest +30 seconds control', 'src/features/workouts/components/RestTimerPanel.tsx', 'addTime(30)'],
  ['rest timer uses persisted end timestamp', 'src/components/providers/RestTimerProvider.tsx', 'endsAt'],
  ['rest memory per exercise', 'src/features/workouts/components/ActiveWorkoutClient.tsx', 'ovrld:rest-duration:'],
  ['collapsed workout queue', 'src/features/workouts/components/ActiveWorkoutClient.tsx', 'Workout Queue'],
  ['do later support', 'src/features/workouts/components/ActiveWorkoutClient.tsx', 'Do later'],
  ['keep screen awake', 'src/features/workouts/components/ActiveWorkoutClient.tsx', 'Keep screen awake'],
  ['haptics setting', 'src/features/workouts/components/ActiveWorkoutClient.tsx', 'Workout haptics'],
  ['exit protection', 'src/features/workouts/components/ActiveWorkoutClient.tsx', 'Workout still in progress'],
  ['split overview first', 'src/features/splits/components/SplitManager.tsx', 'gc-split-overview-day'],
  ['this week vs repeating plan', 'src/features/splits/components/SplitManager.tsx', 'Repeating Plan'],
  ['separate exercises editor state', 'src/features/splits/components/SplitManager.tsx', 'editingExercises'],
  ['change workout secondary flow', 'src/features/splits/components/SplitManager.tsx', 'Change workout'],
  ['bottom nav only uses active state', 'src/components/navigation/BottomNavigation.tsx', 'gc-bottom-nav-active'],
  ['service worker cache bumped', 'public/sw.js', 'v20'],
];

let failed = 0;
for (const [label, file, needle] of checks) {
  const content = fs.readFileSync(file, 'utf8');
  const ok = content.includes(needle);
  console.log(`${ok ? '✓' : '✗'} ${label}`);
  if (!ok) failed += 1;
}

if (failed) {
  console.error(`Pass 3 verification failed: ${failed}/${checks.length} checks.`);
  process.exit(1);
}
console.log(`Pass 3 verification passed (${checks.length}/${checks.length}).`);
