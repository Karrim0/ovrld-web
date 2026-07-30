# Gym Crew v1.1 — Home & Plan Hotfix

This hotfix addresses two real application edge cases and one browser-testing issue.

## Code fixes

1. `/dashboard` now redirects users without a personal/group workspace to `/onboarding` instead of rendering a broken Home screen.
2. `/split/personal` now redirects users without a workspace to `/onboarding` instead of returning an empty page.
3. Home's current weekday is resolved after browser mount so the server and client do not disagree around timezone/day boundaries.
4. Today's workout date is resolved from the browser's local timezone after mount, avoiding SSR/client date mismatches.
5. A clear fallback is shown when no workout is assigned to the current day.

## Important browser issue

The supplied log contains an injected element with the classes:

`simulator-pre-loader simulator`

That element is not part of Gym Crew. A mobile-simulator/browser extension is changing the DOM before React hydrates it. This causes the repeated `removeChild`, hydration mismatch, and maximum update depth errors.

Disable that extension for localhost and Vercel, then test with either:

- a real phone, or
- Chrome DevTools device toolbar (`Ctrl + Shift + M`), or
- an Incognito window with extensions disabled.

Do not try to solve an extension-injected DOM mismatch with `suppressHydrationWarning`; structural DOM changes can still break hydration.

## Install

Copy the `src` folder into the project root and replace the matching files.

Then stop all Node processes and clear the Next cache:

```cmd
taskkill /F /IM node.exe
rmdir /s /q .next
npm run typecheck
npm run lint
npm run build
npm run dev
```

No Supabase migration is required.
