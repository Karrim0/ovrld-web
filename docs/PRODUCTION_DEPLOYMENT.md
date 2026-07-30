# OVRLD Web production deployment

## 1. Preflight

From the release branch:

```bash
npm ci
npm run phase3:check
npm run verify:production-env
npm run security:audit:production
```

Keep the working tree clean and do not continue if TypeScript, ESLint, build, environment validation, or the production dependency audit fails.

## 2. GitHub

1. Open a pull request from `phase/ovrld-web-final-alignment` to `main`.
2. Wait for the OVRLD Web CI workflow to pass.
3. Review the changed migrations as historical alignment files; do not execute them during the merge.
4. Merge the pull request.
5. Rename the repository to `ovrld-web` after the merge.
6. Update the local remote:

```bash
git remote set-url origin https://github.com/Karrim0/ovrld-web.git
git remote -v
```

## 3. Vercel project

Use the existing Vercel project so deployment history and domain configuration remain intact.

- Set the production branch to `main`.
- Set the project/framework preset to Next.js.
- Use Node.js 22.
- Add the production environment variables listed below.
- Rename the Vercel project to OVRLD only after confirming the existing deployment remains connected.

Required public variables:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_PUBLIC_ANON_KEY
NEXT_PUBLIC_APP_URL=https://YOUR_FINAL_PRODUCTION_DOMAIN
```

Optional server-only Smart Plan Import variables:

```env
OPENAI_API_KEY=YOUR_SERVER_ONLY_KEY
OPENAI_PLAN_IMPORT_MODEL=gpt-5.6-luna
```

Do not place private values in `NEXT_PUBLIC_` variables.

## 4. Supabase Auth URLs

After selecting the final production domain:

- Set the Supabase Auth Site URL to the final HTTPS production origin.
- Add the exact production callback URL:

```text
https://YOUR_FINAL_PRODUCTION_DOMAIN/auth/callback
```

- Add each preview callback URL only when that preview needs authentication testing.
- Remove obsolete Gym Crew production domains after the new callback has been tested successfully.

No database push is required for this web release.

## 5. Preview verification

Deploy the release branch as a preview and check:

- `/api/health` returns `status: ok`, product `OVRLD Web`, and version `1.8.0`.
- Register and password-reset links return to the preview domain.
- Login restores the requested protected page.
- Workout data matches the same account on mobile.
- Offline changes synchronize once after reconnecting.
- The PWA installs as OVRLD.

## 6. Production smoke test

After deploying `main`:

- Test login and logout in a private browser window.
- Start and finish a test workout, then verify it on mobile.
- Finish a mobile workout, focus the web tab, and verify refresh.
- Test one offline set and reconnect.
- Verify Arabic/English and light/dark modes.
- Confirm no old Gym Crew title appears in browser metadata or the install prompt.

## 7. Release and rollback

Create the release tag only after the smoke test passes:

```bash
git switch main
git pull --ff-only origin main
git tag -a v1.8.0 -m "OVRLD Web v1.8.0 final release"
git push origin v1.8.0
```

For rollback, redeploy the previous successful Vercel deployment. Do not roll back or rewrite the shared Supabase migration history as part of a web rollback.
