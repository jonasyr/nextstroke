import type { CoachIntent, Idea } from "@nextstroke/contracts";
import type { Technique } from "@nextstroke/materials";

/**
 * Idea templates (Phase 3 Task 3, D-065): what a black fineliner can add for each intent, at
 * three levels of change (D-014: Careful, Balanced, Bold by area, contrast, steps and physical
 * risk). Only additive marks: ink cannot be lightened or erased. Numbers in the steps come
 * from the feasibility rules (spacing from the tip), never from the template.
 */

export type Level = Idea["risk"];

export interface StepValues {
  /** Smallest spacing between lines or dots, e.g. "0,4 mm". */
  spacing: string;
  /** Where to work: the marked area, or the place the user has in mind. */
  place: string;
}

export interface Template {
  id: string;
  intent: CoachIntent;
  level: Level;
  technique: Technique;
  title: string;
  why: string;
  /** What to try first on a scrap of the same paper. */
  practice: (v: StepValues) => string;
  steps: (v: StepValues) => string[];
}

export const TEMPLATES: Template[] = [
  // Depth: shadow makes form.
  {
    id: "depth-careful",
    intent: "depth",
    level: "careful",
    technique: "hatching",
    title: "Die dunkelste Stelle schraffieren",
    why: "Schon eine Lage Schatten auf der lichtabgewandten Seite lässt eine Form runder wirken.",
    practice: (v) => `fünf parallele Linien im gleichen Winkel, ${v.spacing} Abstand`,
    steps: (v) => [
      "Lege fest, von welcher Seite das Licht kommt. Der Schatten liegt gegenüber.",
      `Schraffiere ${v.place} nur den dunkelsten Teil der Schattenseite: parallele Linien im gleichen Winkel, mindestens ${v.spacing} Abstand.`,
      "Hör auf, bevor die Fläche zuläuft. Nachlegen geht immer, wegnehmen nicht.",
    ],
  },
  {
    id: "depth-balanced",
    intent: "depth",
    level: "balanced",
    technique: "crossHatching",
    title: "Schatten in zwei Lagen",
    why: "Eine zweite, gekreuzte Lage macht den dunkelsten Teil dunkler und gibt einen weichen Übergang.",
    practice: (v) =>
      `eine Lage Schraffur, trocknen lassen, dann eine zweite Lage im Winkel von etwa 45°, ${v.spacing} Abstand`,
    steps: (v) => [
      "Lege fest, von welcher Seite das Licht kommt. Der Schatten liegt gegenüber.",
      `Erste Lage: die ganze Schattenseite ${v.place} mit parallelen Linien, ${v.spacing} Abstand.`,
      "Warten, bis die Tinte trocken ist.",
      "Zweite Lage im Winkel von etwa 45° nur über das dunkelste Drittel.",
    ],
  },
  {
    id: "depth-bold",
    intent: "depth",
    level: "bold",
    technique: "crossHatching",
    title: "Schatten mit Schlagschatten",
    why: "Ein Schlagschatten auf dem Untergrund verankert die Form und gibt dem Bild deutlich mehr Tiefe.",
    practice: (v) => `eine Fläche in zwei gekreuzten Lagen, ${v.spacing} Abstand, mit weichem Rand`,
    steps: (v) => [
      "Lege fest, von welcher Seite das Licht kommt. Der Schatten liegt gegenüber.",
      `Schattenseite ${v.place} in zwei gekreuzten Lagen, ${v.spacing} Abstand, jede Lage trocknen lassen.`,
      "Zeichne auf dem Untergrund den Schlagschatten: dort, wo die Form das Licht verdeckt, vom Fuß der Form weg.",
      "Den Schlagschatten direkt an der Form am dunkelsten, nach außen mit weiteren Abständen auslaufen lassen.",
    ],
  },
  // Contrast: darker darks next to the paper white.
  {
    id: "contrast-careful",
    intent: "contrast",
    level: "careful",
    technique: "lineWeight",
    title: "Kontur auf der Schattenseite verstärken",
    why: "Eine kräftigere Linie dort, wo die Form vom Licht weg zeigt, hebt sie vom Hintergrund ab.",
    practice: () =>
      "eine Linie und direkt daneben eine zweite, bis sie zu einer dicken Linie verschmelzen",
    steps: (v) => [
      `Suche ${v.place} die Konturen auf der Schattenseite und unten, wo die Form aufliegt.`,
      "Ziehe dort eine zweite Linie dicht an die vorhandene, oder nimm eine dickere Spitze.",
      "Die Konturen auf der Lichtseite bleiben dünn.",
    ],
  },
  {
    id: "contrast-balanced",
    intent: "contrast",
    level: "balanced",
    technique: "hatching",
    title: "Hintergrund an hellen Kanten abdunkeln",
    why: "Helle Kanten wirken heller, wenn direkt daneben dunkle Fläche liegt.",
    practice: (v) => `eine Schraffur, die genau an einer Linie endet, ${v.spacing} Abstand`,
    steps: (v) => [
      `Suche ${v.place} die hellsten Kanten der Form.`,
      `Schraffiere den Hintergrund direkt an diesen Kanten auf einem schmalen Streifen, ${v.spacing} Abstand.`,
      "Die Schraffur endet genau an der Kante und läuft nach außen aus.",
    ],
  },
  {
    id: "contrast-bold",
    intent: "contrast",
    level: "bold",
    technique: "negativeSpace",
    title: "Dunkler Hintergrund, helle Form",
    why: "Eine dunkle Fläche um die Form lässt das freie Papier der Form strahlen.",
    practice: (v) => `eine dichte Fläche aus zwei gekreuzten Lagen, ${v.spacing} Abstand`,
    steps: (v) => [
      `Lege ${v.place} die Fläche fest, die dunkel werden soll, und lass die Form selbst frei.`,
      `Erste Lage über die ganze Fläche, ${v.spacing} Abstand, trocknen lassen.`,
      "Zweite Lage gekreuzt, dann nach Bedarf eine dritte, bis die Form sich klar abhebt.",
    ],
  },
  // Texture: surface character.
  {
    id: "texture-careful",
    intent: "texture",
    level: "careful",
    technique: "stippling",
    title: "Eine kleine Fläche punktieren",
    why: "Punkte geben eine raue Oberfläche, ohne Linien zu ziehen, und lassen sich langsam verdichten.",
    practice: (v) => `eine Fläche Punkte, mindestens ${v.spacing} auseinander, senkrecht getupft`,
    steps: (v) => [
      `Wähle ${v.place} eine kleine Fläche mit rauer Oberfläche.`,
      `Setze Punkte senkrecht mit der Spitze, mindestens ${v.spacing} auseinander, im Schatten dichter.`,
    ],
  },
  {
    id: "texture-balanced",
    intent: "texture",
    level: "balanced",
    technique: "hatching",
    title: "Kurze Striche in Wuchsrichtung",
    why: "Kurze Striche, die der Oberfläche folgen (Fell, Holz, Gras), beschreiben das Material.",
    practice: (v) => `kurze, leicht gebogene Striche in einer Richtung, ${v.spacing} Abstand`,
    steps: (v) => [
      `Bestimme ${v.place} die Richtung, in die die Oberfläche läuft.`,
      `Setze kurze Striche in diese Richtung, ${v.spacing} Abstand, im Schatten dichter.`,
      "Lichtstellen frei lassen.",
    ],
  },
  {
    id: "texture-bold",
    intent: "texture",
    level: "bold",
    technique: "crossHatching",
    title: "Struktur in mehreren Lagen",
    why: "Mehrere gekreuzte Lagen kurzer Striche geben eine dichte, greifbare Oberfläche.",
    practice: (v) => `kurze Striche in zwei Richtungen übereinander, ${v.spacing} Abstand`,
    steps: (v) => [
      `Erste Lage kurzer Striche ${v.place} in Wuchsrichtung, ${v.spacing} Abstand, trocknen lassen.`,
      "Zweite Lage quer dazu nur im Schatten.",
      "Lichtstellen frei lassen, damit die Struktur nicht flach wird.",
    ],
  },
  // Outline: line quality.
  {
    id: "outline-careful",
    intent: "outline",
    level: "careful",
    technique: "lineWeight",
    title: "Nur die Außenkontur betonen",
    why: "Eine kräftigere Außenlinie trennt die Form vom Hintergrund, die Innenlinien bleiben leicht.",
    practice: () => "eine Linie und dicht daneben eine zweite, bis sie verschmelzen",
    steps: (v) => [
      `Fahre ${v.place} nur die äußere Umrisslinie nach, dicht an der vorhandenen Linie.`,
      "Innenlinien nicht nachziehen.",
    ],
  },
  {
    id: "outline-balanced",
    intent: "outline",
    level: "balanced",
    technique: "lineWeight",
    title: "Dick im Schatten, dünn im Licht",
    why: "Wechselnde Strichstärke zeigt, wo Licht ist, und wirkt lebendiger als eine gleich dicke Linie.",
    practice: () => "eine Linie, die mit doppeltem Strich dick beginnt und einfach dünn endet",
    steps: (v) => [
      "Lege fest, von welcher Seite das Licht kommt.",
      `Verstärke ${v.place} die Konturen auf der Schattenseite mit einer zweiten Linie.`,
      "Auf der Lichtseite die Linien so lassen, wie sie sind.",
    ],
  },
  {
    id: "outline-bold",
    intent: "outline",
    level: "bold",
    technique: "lineWeight",
    title: "Überschneidungen betonen",
    why: "Wo eine Form hinter einer anderen liegt, macht eine dunkle Linie die Reihenfolge klar.",
    practice: () => "zwei sich überlappende Kreise, die Linie des hinteren am Übergang verstärkt",
    steps: (v) => [
      `Suche ${v.place} alle Stellen, an denen eine Form hinter einer anderen verschwindet.`,
      "Verstärke dort die Linie der vorderen Form und setze einen kurzen Schatten auf die hintere.",
      "Danach die Außenkontur auf der Schattenseite verstärken.",
    ],
  },
  // Background: space around the subject.
  {
    id: "background-careful",
    intent: "background",
    level: "careful",
    technique: "contour",
    title: "Eine Standlinie setzen",
    why: "Eine kurze Bodenlinie mit etwas Schatten gibt der Form einen Platz, ohne den Hintergrund zu füllen.",
    practice: () => "eine waagrechte Linie mit ein paar kurzen Strichen darunter",
    steps: (v) => [
      `Ziehe ${v.place} unter der Form eine leichte waagrechte Linie für den Boden.`,
      "Setze unter die Form ein paar kurze, waagrechte Striche als Schatten.",
    ],
  },
  {
    id: "background-balanced",
    intent: "background",
    level: "balanced",
    technique: "hatching",
    title: "Ruhige Schraffur mit Lichthof",
    why: "Ein gleichmäßig schraffierter Hintergrund mit freiem Rand um die Form rahmt sie, ohne abzulenken.",
    practice: (v) => `eine gleichmäßige Fläche paralleler Linien, ${v.spacing} Abstand`,
    steps: (v) => [
      `Lass ${v.place} rund um die Form einen schmalen Rand frei.`,
      `Schraffiere den Hintergrund in einer Richtung, gleichmäßig, ${v.spacing} Abstand.`,
      "Zum Bildrand hin dürfen die Abstände größer werden.",
    ],
  },
  {
    id: "background-bold",
    intent: "background",
    level: "bold",
    technique: "crossHatching",
    title: "Dunkler Hintergrund",
    why: "Ein dunkler Hintergrund gibt starken Kontrast und eine geschlossene Bildwirkung.",
    practice: (v) =>
      `drei gekreuzte Lagen übereinander, ${v.spacing} Abstand, jede trocknen lassen`,
    steps: (v) => [
      `Erste Lage ${v.place} über den ganzen Hintergrund, ${v.spacing} Abstand, die Form frei lassen.`,
      "Trocknen lassen, dann eine zweite Lage gekreuzt.",
      "Eine dritte Lage nur dort, wo es am dunkelsten werden soll.",
    ],
  },
  // Detail: small, precise additions.
  {
    id: "detail-careful",
    intent: "detail",
    level: "careful",
    technique: "contour",
    title: "Kleine Details nachziehen",
    why: "Mit der feinsten Spitze nachgezogene kleine Formen machen das Bild klarer, ohne es zu verändern.",
    practice: () => "kleine Kreise und kurze Linien mit der feinsten Spitze",
    steps: (v) => [
      `Ziehe ${v.place} kleine Formen mit der feinsten Spitze nach, die bisher nur angedeutet sind.`,
      "Langsam ziehen, die Hand aufgelegt.",
    ],
  },
  {
    id: "detail-balanced",
    intent: "detail",
    level: "balanced",
    technique: "stippling",
    title: "Feine Schatten punktieren",
    why: "Punkte geben in kleinen Bereichen feine Schatten, die Linien zu grob wären.",
    practice: (v) => `eine kleine Fläche Punkte, ${v.spacing} auseinander`,
    steps: (v) => [
      `Setze ${v.place} in kleinen Schattenstellen Punkte, mindestens ${v.spacing} auseinander.`,
      "Zum Licht hin weniger Punkte.",
    ],
  },
  {
    id: "detail-bold",
    intent: "detail",
    level: "bold",
    technique: "hatching",
    title: "Details mit kleinen Schatten",
    why: "Kleine Schatten an jedem Detail geben dem Bild Präzision und Tiefe im Kleinen.",
    practice: (v) => `kurze Schraffuren auf kleiner Fläche, ${v.spacing} Abstand`,
    steps: (v) => [
      "Lege fest, von welcher Seite das Licht kommt.",
      `Setze ${v.place} an jedes Detail auf der Schattenseite eine kurze Schraffur, ${v.spacing} Abstand.`,
      "Danach die Konturen dieser Details auf der Schattenseite verstärken.",
    ],
  },
];

/**
 * Always feasible with any black fineliner on any paper: used when an intent's own template
 * for a level is not feasible, so every request still gets exactly three ideas.
 */
export const FALLBACKS: Record<Level, Template> = {
  careful: {
    id: "fallback-careful",
    intent: "outline",
    level: "careful",
    technique: "contour",
    title: "Eine Kontur klarer ziehen",
    why: "Eine einzelne, ruhig nachgezogene Linie ist die sicherste Änderung mit Fineliner.",
    practice: () => "eine lange Linie in einem Zug, die Hand aufgelegt",
    steps: (v) => [
      `Ziehe ${v.place} eine wichtige Kontur ruhig in einem Zug nach.`,
      "Nur diese eine Linie.",
    ],
  },
  balanced: {
    id: "fallback-balanced",
    intent: "outline",
    level: "balanced",
    technique: "lineWeight",
    title: "Konturen im Schatten verstärken",
    why: "Stärkere Linien auf der Schattenseite geben Form, ohne Fläche zu füllen.",
    practice: () => "eine Linie und dicht daneben eine zweite",
    steps: (v) => [
      "Lege fest, von welcher Seite das Licht kommt.",
      `Verstärke ${v.place} die Konturen auf der Schattenseite mit einer zweiten Linie.`,
    ],
  },
  bold: {
    id: "fallback-bold",
    intent: "outline",
    level: "bold",
    technique: "lineWeight",
    title: "Überschneidungen und Schattenseite betonen",
    why: "Betonte Überschneidungen und Schattenkonturen klären das ganze Bild.",
    practice: () => "zwei überlappende Formen, die Linie am Übergang verstärkt",
    steps: (v) => [
      `Verstärke ${v.place} jede Linie, an der eine Form hinter einer anderen liegt.`,
      "Danach alle Konturen auf der Schattenseite.",
    ],
  },
};
