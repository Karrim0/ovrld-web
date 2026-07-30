# Gym Crew Phase 6 Patch

## Install

Copy the contents of this patch into the project root and replace matching
files. Do not copy the outer patch folder itself.

Then run:

```bash
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
npx supabase gen types typescript --linked --schema public > src/lib/supabase/types.ts
npx tsc --noEmit
npm run lint
npm run build
```

The migration applied by this patch is:

```text
202607140005_gym_mode_personal_split.sql
```

## Important data change

Starter split exercises that still use 3 or 4 non-personal working sets are
moved to 2 sets. Personal additions keep their existing set count.

## Mobile test checklist

1. Open My Split and rename a training day.
2. Change a day to Custom and save it.
3. Create an exercise with a custom name and add it with 2 sets.
4. Start a workout on a mobile-sized viewport.
5. Record weight and reps, complete a set, and refresh the page.
6. Confirm the set is still saved.
7. Open the floating REST button and test 3, 4, and 5 minute presets.
8. Navigate between pages and confirm the rest timer continues.
9. Finish the workout and confirm session duration is stored automatically.
