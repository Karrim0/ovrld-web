# Dependency security audit

The latest Windows install during finalization reported 8 advisories (1 moderate, 6 high, 1 critical). The patch-build environment cannot reliably reach npm advisory data, so this release does not guess at the affected dependency paths and does not apply broad dependency changes.

## Required local checks

```bash
npm audit --omit=dev
npm audit
```

For a reviewable report:

```bash
npm audit --json > npm-audit.json
```

Do not commit the report if it includes local paths or environment information.

## Decision rule

- If `npm audit --omit=dev` passes but the full audit fails, classify and update the affected development tooling on a dedicated branch.
- If the production audit fails, identify the direct dependency path and apply targeted compatible upgrades before production deployment.
- Do not use `npm audit fix --force` on `main` or the release branch because it may introduce breaking framework, CLI, or build-tool upgrades.

## Verification after any dependency update

```bash
npm ci
npm run pass4:check
npm audit --omit=dev
```

Commit `package.json` and `package-lock.json` together.
