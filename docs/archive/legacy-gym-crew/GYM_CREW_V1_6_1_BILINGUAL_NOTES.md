# Gym Crew v1.6.1 — Arabic + English

This update restores English without removing the Egyptian Arabic experience introduced in v1.6.

## What changed

- Added an in-app language switcher for **العربية / English**.
- Arabic remains the default language.
- The selected language is saved on the device and restored on the next visit.
- Arabic uses `ar-EG` and RTL layout; English uses LTR layout.
- Added the switcher to:
  - Authentication screens.
  - Main application headers.
  - Profile settings.
- Added English presentation for the complete v1.6 UI copy, including:
  - Onboarding and authentication.
  - Home, split setup and weekly plan tools.
  - Guided Gym Mode and rest timer.
  - Progress, history and personal records.
  - Groups, privacy and leaderboard screens.
  - Smart plan import and validation messages.
  - Runtime alerts, confirmations, placeholders and accessibility labels.
- Kept workout names, exercise names, weights, sets, history and all stored data unchanged when switching languages.
- Added LTR/RTL layout handling for the desktop sidebar, content spacing, auth layout and navigation arrows.
- Added a no-flash bootstrap for users who previously selected English.
- Version updated to `1.6.1`.

## Installation

Apply the patch from the project root:

```bat
git apply --check gym-crew-v1.6.1-bilingual.patch
git apply gym-crew-v1.6.1-bilingual.patch
npm run typecheck
npm run lint
rmdir /s /q .next 2>nul
npm run build
npm run dev
```

Or extract the replacement-files ZIP in the project root and approve file replacement.

## Database and environment

- No Supabase migration is required.
- No new environment variable is required.
- Do not run `npx supabase db push` for this update.

## Suggested release commit

```bat
git add .
git commit -m "feat: add Arabic and English language switching"
git push origin main
```

## Verification completed

- `npm run typecheck`: passed.
- `npm run lint`: passed.
- Next.js production compilation: passed.
- TypeScript production step: passed.
- Static page generation: 36/36 passed.

The container build printed the complete route table successfully but did not exit after Next.js reached the build-trace cleanup stage; run the final build locally before pushing, as shown above.
