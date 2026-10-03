/** German UI copy, the only shipped locale in v0.1 (D-040). Keys are stable; English follows later. */
export const de = {
  "app.name": "NextStroke",
  "app.tagline": "Physische Kunst, Schritt für Schritt.",
  "status.version": "Version {version}",
  "nav.label": "Hauptnavigation",
  "nav.home": "Start",
  "nav.compare": "Schnellvergleich",
  "nav.projects": "Projekte",
  "nav.guided": "Geführtes Projekt",
  "page.home.intro":
    "Vergleiche deine Zeichnung mit einer Vorlage oder einem früheren Stand und plane den nächsten Strich.",
  "page.compare.intro":
    "Original und Vorlage übereinanderlegen. Funktioniert ohne Konto, ohne Netz und ohne KI.",
  "page.projects.intro": "Deine Projekte bleiben auf diesem Gerät. Sicherung per Export.",
  "page.guided.intro":
    "Schritt-für-Schritt-Begleitung für Fineliner folgt in einer späteren Phase.",
  "page.notReady": "Noch nicht verfügbar.",
  "offline.banner":
    "Offline: Der Schnellvergleich funktioniert weiter, KI-Funktionen brauchen Netz.",
  "immersive.open": "Vollbild",
  "immersive.close": "Vollbild schließen",
  "update.available": "Eine neue Version ist bereit.",
  "update.reload": "Neu laden",
} as const;

export type MessageKey = keyof typeof de;
