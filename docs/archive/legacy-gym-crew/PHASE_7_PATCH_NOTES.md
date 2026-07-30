# Gym Crew Phase 7 Patch

## Install

1. Copy the patch contents into the project root and replace matching files.
2. Link the folder to Supabase if needed:

```bash
npx supabase link --project-ref YOUR_PROJECT_REF
```

3. Apply the migration:

```bash
npx supabase db push
```

4. Regenerate database types:

```bash
npx supabase gen types typescript --linked --schema public > src/lib/supabase/types.ts
```

5. Verify:

```bash
npx tsc --noEmit
npm run lint
npm run build
```

## Manual test checklist

- Open Progress and switch the 8-week chart between volume, sets, and sessions.
- Open Body Map and switch 7/30/90 days and sets/volume.
- Open an exercise and switch e1RM, load, and volume trends.
- Open Group Activity and confirm feed and weekly consistency board load.
- Toggle privacy settings and confirm hidden values become Private/absent for another account.
- Edit the shared group split as an admin.
- Open the group as a member and choose Keep mine or Use group plan.
- Confirm solo workspaces still show personal analytics and do not expose social pages.
