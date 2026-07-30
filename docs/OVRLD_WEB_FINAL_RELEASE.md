# OVRLD Web v1.8.0 — Final Release

Release date: 2026-07-30

## Scope

This release completes the production alignment of OVRLD Web with OVRLD Mobile while preserving the existing web interface and offline data.

## Included

- Shared active Supabase migration chain and generated database types.
- OVRLD metadata, package identity, PWA identity, and visible product copy.
- Safe migration of legacy browser settings and cache cleanup.
- Preserved physical IndexedDB name for existing offline users.
- Protected-route restoration after login.
- Cross-platform workout freshness without overwriting pending local mutations.
- Interrupted-sync recovery and exponential retry backoff.
- Target-rep and set-note preservation.
- Final repository cleanup and archived historical notes.
- Unified GitHub Actions quality gate.
- Production environment and deployment verification.

## Release gate

```bash
npm ci
npm run phase3:check
npm run verify:production-env
```

On Windows:

```bat
VERIFY_OVRLD_WEB_FINAL.cmd
```

## Manual product checks

- Register, confirm email, login, logout, and reset password.
- Create a Solo profile and open all primary destinations.
- Create or join a Crew and verify membership data.
- Open a plan, start a workout, and log/edit sets.
- Start online, continue offline, reconnect, and verify one-time synchronization.
- Finish a workout on mobile and verify the web client refreshes on focus.
- Verify Arabic/English and light/dark modes after refresh.
- Install the PWA and verify the OVRLD name and icon.

## Database rule

Do not apply the committed migration chain to production automatically. It represents the already-adopted OVRLD backend history. Compare the linked remote migration list before any database command.

## Release tag

After the branch is merged and the production smoke test passes, create the annotated tag:

```bash
git tag -a v1.8.0 -m "OVRLD Web v1.8.0 final release"
git push origin v1.8.0
```
