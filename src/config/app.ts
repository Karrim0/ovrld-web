/**
 * Product metadata shared by the web shell, PWA manifest, health endpoint,
 * repository verification, and release documentation.
 */
export const APP_CONFIG = {
  name: "OVRLD",
  fullName: "OVRLD Web",
  version: "1.8.0",
  releaseChannel: "stable",
  description: "جدولك، تمرينك، وأرقامك في مكان واحد.",
  englishDescription:
    "A focused workout planner, gym logger, and progress tracker built around real training data.",
} as const;
