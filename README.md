# OVRLD Pass 5 Hydration/Auth Hotfix

Overlay this patch on the current OVRLD project root.

Fixes:
- Prevents the brand string `TRAIN · LOG · PROGRESS` from being mutated by runtime localization during hydration.
- Prevents short translations such as ` · PR` from matching inside longer words such as ` · PROGRESS`.
- Extends Pass 5 verification with regression checks for both issues.

After replacing files:

```bat
del tsconfig.tsbuildinfo 2>nul
npm run check
npm run dev
```

The Supabase `Invalid Refresh Token` / `JWT issued at future` messages are session/auth-state issues, not part of this UI patch. Clear localhost site data/cookies and sign in again. If `JWT issued at future` still appears after a fresh login, sync Windows time and retry; if it still persists, inspect the fresh access token/server clock rather than changing app UI code.
