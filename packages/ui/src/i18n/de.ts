/** German UI copy, the only shipped locale in v0.1 (D-040). Keys are stable; English follows later. */
export const de = {
  "app.name": "NextStroke",
  "app.tagline": "Physische Kunst, Schritt für Schritt.",
  "status.version": "Version {version}",
} as const;

export type MessageKey = keyof typeof de;
