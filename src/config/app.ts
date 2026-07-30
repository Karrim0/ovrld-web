/**
 * Product metadata shared by the web shell, PWA manifest, health endpoint,
 * repository verification, and release documentation.
 */
export const APP_CONFIG = {
  name: "OVRLD",
  fullName: "OVRLD Web",
  version: "1.8.0",
  releaseChannel: "stable",
  description: "نظّم تمرينك، سجّل السِتات، وتابع تقدمك من أي جهاز.",
  englishDescription:
    "Offline-first workout planning, set logging, and progress tracking for serious training.",
} as const;
