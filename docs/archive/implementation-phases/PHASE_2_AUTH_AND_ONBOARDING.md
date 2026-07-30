# Phase 2: Authentication and group onboarding

## Implemented

- Real email/password registration and login through Supabase Auth.
- Automatic profile creation through the existing database trigger.
- Email confirmation callback with a safe local redirect path.
- Forgot-password email request and a real update-password screen.
- Logout action from the dashboard.
- Auth-aware route protection for dashboard and onboarding routes.
- Server-side membership guards:
  - authenticated members with a group are routed to the dashboard;
  - authenticated members without a group are routed to onboarding;
  - unauthenticated visitors are routed to login.
- Real group creation using `create_group_with_owner`.
- Real invite-code joining using `join_group_by_invite_code`.
- Dashboard verification card showing the current group, role, and invite code.
- The invite-code validator now matches the database's eight-character code.

## Verification completed

- `npx tsc --noEmit`
- `npm run lint`
- `npm run build`
- Unauthenticated route smoke test:
  - `/login` returns 200;
  - `/dashboard` redirects to `/login`;
  - `/onboarding` redirects to `/login`.

## Supabase dashboard setup required

For local email confirmation and password recovery, configure Authentication URL settings:

- Site URL: `http://localhost:3000`
- Redirect URL: `http://localhost:3000/auth/callback`

The returned archive intentionally excludes `.env.local`, `node_modules`, `.next`,
Supabase CLI temporary link data, and TypeScript build cache files.

## Next phase

Implement the exercise library and the shared/personal weekly split, then connect
the dashboard's "today's workout" calculation to the real split data.
