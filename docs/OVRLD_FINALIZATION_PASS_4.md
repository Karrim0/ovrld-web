# OVRLD Finalization Pass 4 — Release Candidate Polish

Pass 4 closes the remaining product-consistency work after the Home, Game Mode, and My Split redesign.

## What changed

### Workout feedback controls

Workout Options now separates feedback into three independent preferences:

- Set-completion haptic
- Rest-end haptic
- Rest-end sound

A single **Silent** action disables all three. Rest sound and rest haptics can also be tested from the expanded Rest Timer. Preferences are stored locally on the device.

### Workout metrics as one source of truth

`src/features/workouts/utils/workout-metrics.ts` now owns the shared workout-count calculations used by:

- Today's Workout / Home Train card
- My Split overview
- Active Workout progress
- Workout Summary

Planned workouts use one shared exercise/set estimator. Session summaries use one shared calculation for completed sets, working sets, volume, and PR count.

Warm-up sets remain part of the session log but are excluded from working-set volume and performance comparisons. The database PR functions already exclude warm-up sets.

### Localization release sweep

- Main navigation now has explicit Arabic and English labels rather than depending on DOM translation.
- Server-provided dashboard header titles render through the language context.
- Runtime localization covers dynamic workout counts, units, dates/month fragments, body metrics, and Gain Mode status strings.
- Textarea user content remains untouched while placeholders and accessible labels can be translated.
- Static TSX UI coverage was scanned against the Arabic→English map and the remaining unmapped static UI phrases were added.
- Pass 4 verification checks for duplicate literal localization keys to prevent the TS1117 regression from Pass 2.

### Workout Summary

The summary now uses working sets for volume/count metrics and adds a compact **Top progress** comparison, for example:

`50 kg × 8 → 52.5 kg × 8`

The badge says `PR ↑` only when the exercise actually contains a recorded PR; ordinary improvement is labeled as improvement rather than a false PR.

### Navigation and mobile consistency

- Mobile and desktop navigation render the selected language directly.
- Workout History belongs to Progress without simultaneously activating Workout.
- Active Workout still hides global navigation.
- Existing safe-area padding and shared PageContainer behavior remain the layout baseline.

### PWA cache

Service-worker cache version is now `v21` so clients do not keep stale UI/localization assets from Pass 3.

## No database migration

Pass 4 changes client/product behavior only. No Supabase migration is required.

## Verification

Run:

```bash
npm install
npm run verify:pass4
npm run typecheck
npm run lint
npm run build
```

Then review production dependency advisories separately:

```bash
npm audit --omit=dev
npm audit
```

Do not run `npm audit fix --force` on the release branch.

## Release runtime

The project engine remains Node `>=22 <23`. Use Node 22 for the release candidate and deployment build.
