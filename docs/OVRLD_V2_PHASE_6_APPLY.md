# OVRLD V2 Phase 6 — Apply & test

Phase 6 is cumulative over Phase 5.1. The recommended path is to extract the **update-only** archive over the current working project so `.env.local`, `.git`, installed dependencies and the existing Supabase CLI link stay local.

## 1. Apply code

1. Stop the dev server.
2. Back up or commit the current working tree.
3. Extract the Phase 6 update-only archive over the project root and replace matching files.
4. Do **not** replace/copy `.env.local`, `.git`, `node_modules` or `.next` from an archive.

## 2. Local checks

Run:

```bash
npm run typecheck
npm run build
```

If either command fails, do not deploy yet; fix or share the exact output first.

## 3. Database dry run

Phase 6 adds exactly one migration:

```text
202609080003_gain_mode_v1.sql
```

Run:

```bash
npx supabase migration list
npx supabase db push --dry-run
```

The dry run should list **only** `202609080003_gain_mode_v1.sql` as pending. If anything else appears, stop before pushing.

Then apply it:

```bash
npx supabase db push
```

## 4. Fresh-account test

The migration intentionally marks existing profiles as onboarding-complete so established users are not forced through a new onboarding screen. To test the new user journey exactly as a first-time user, create a genuinely new test account after the migration (or delete/reset the old test account first).

Test this path on mobile/PWA:

1. Register a new account.
2. Create the private/solo training space.
3. Confirm the Goal Mode choice appears and cannot be skipped.
4. Choose **Standard OVRLD** once and verify no body data is required.
5. With another fresh account, choose **Gain Mode**.
6. Enter current weight, height, adult age, optional target, appetite/activity and weigh-in cadence.
7. Confirm the initial weight persists in Body & weight.
8. Confirm `/progress/gain` shows the Gain journey and `/progress` still shows training progress.
9. Confirm Home order is Today → process action → compact week.
10. Confirm mobile Account contains language and appearance controls.

For an installed PWA that previously cached an older build, remove/reinstall it or clear site data before the final mobile smoke test.
