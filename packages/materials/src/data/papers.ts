import type { PaperProfile } from "@nextstroke/contracts";

/**
 * Paper categories the user picks from. Their ink behaviour is a general NextStroke assumption
 * (generic: true), not a product fact; the optional calibration card replaces it with an
 * observation on the user's own sheet.
 */
export const PAPERS: PaperProfile[] = [
  {
    id: "bristol-smooth",
    name: "Bristol, glatt",
    surface: "smooth",
    feathers: "no",
    generic: true,
  },
  { id: "drawing", name: "Zeichenpapier", surface: "medium", feathers: "no", generic: true },
  {
    id: "mixed-media",
    name: "Mixed-Media-Papier",
    surface: "medium",
    feathers: "no",
    generic: true,
  },
  { id: "sketch", name: "Skizzenpapier", surface: "medium", feathers: "possible", generic: true },
  {
    id: "watercolor",
    name: "Aquarellpapier",
    surface: "rough",
    feathers: "possible",
    generic: true,
  },
  {
    id: "copy",
    name: "Kopier- oder Druckerpapier",
    surface: "smooth",
    feathers: "likely",
    generic: true,
  },
  { id: "unknown", name: "Weiß ich nicht", surface: "unknown", feathers: "unknown", generic: true },
];
