# Spike: shadow from the drawn form (2026-10-07)

**Question (owner, 2026-10-07):** Can the app know where, and how much, shadow belongs on a drawn object for a given light direction, so the stroke-plan preview (D-071) follows the real form instead of a circle?

**Approach under test:** no model. The user taps the object (one or more taps for parts split by inner lines). The app fills the area inside the closed ink contour, "inflates" it into a rounded height field from its distance to the contour (as in Lumo, Teddy, Monster Mash), lights it from the chosen side, and cuts the result into three tone bands: light (left free), half shadow (one layer), core shadow (crossed layers). Everything runs locally and deterministically; the bands become fills of the existing stroke plan.

**Corpus:** the 13 private Phase 0 drawings (`lab/private/cases/`, never committed) plus synthetic shapes in the unit tests. Tap points per object are written down in `lab/private/shape-spike/taps.json` before the first run.

## Criteria, fixed before the first run

1. **Region:** at least 70 % of the tapped objects with a closed outline give the right area (covers the object, does not leak). At least 90 % of taps on open outlines or the background are refused instead of leaking.
2. **Shadow:** for correct areas, at least 70 % of the shaded results put the core shadow on the side away from the light and follow the form (round things round, long things along their length); judged on a review sheet, confirmed by the owner.
3. **Speed:** at most 300 ms per object at 1024 px on the long side in Node on the development machine (the iPhone check comes later).
4. **Control:** nothing outside the area is ever marked (unit test).

**GO:** all four hold. The shading replaces the circle in the preview, recorded as D-072 with a plan task. **PIVOT:** the circle preview stays; the result and the reason are recorded here.

## Result: PIVOT (2026-10-07)

Two runs with the same taps (written before the first run). Run 1 was the first version; run 2 changed three things after looking at run 1: tone thresholds clear of the value of a surface facing the viewer, gap closing that grows up to three times when an outline leaks, and a wider search when a tap lands on a line. Run 2 is reported below; run 1 was no better on any criterion.

| Criterion | Target | Run 2 | |
|---|---|---|---|
| 1. Right area for closed outlines | ≥ 70 % | 8 of 18 (44 %) | fail |
| 1. Open outline or background refused | ≥ 90 % | 10 of 10 | pass |
| 2. Plausible shadow on right areas | ≥ 70 % | 5 of 8 (62 %) | fail |
| 3. ≤ 300 ms per object at 1024 px | all | 18 of 26 runs, slowest 437 ms | fail (fixable) |
| 4. Nothing outside the area marked | test | holds | pass |

**Where it works:** round forms with a clean, closed outline and a light interior: both lighthouse towers drawn in ink (the core shadow runs down the side away from the light like on a cylinder), the rocks, the moon. Refusing is reliable: no tap on the background or an open outline ever leaked.

**Where it fails, and why:**
- **Interiors already hatched or coloured with strokes** (whale fin, traffic lights, balloon): every gap between strokes is its own tiny area. This is common in fineliner drawings.
- **Sketchy outlines with large gaps** (the digital lighthouse and cloud, the traffic light's visor): refused as leaking. That is safe, but there is no area.
- **Forms split by many inner lines** need every part tapped exactly. One tap on the sail gave half a sail; taps near the edge of the painted lighthouse picked up a strip outside it.
- **Flat forms** (the sign boards): inflation assumes everything is round, so a flat board gets pillow shading along all its edges. A flat board lit from the side has no such shading.

**Decision:** the circle stays in the preview (D-071 unchanged); recorded as D-072. The code stays on branch `spike/shape-shading` (`packages/imaging/src/shading.ts`, tests, `lab/shape/`) and is not merged. A possible follow-up, which would need its own decision and run: an optional "Form antippen" mode that shows the found outline for the user to confirm and asks "rund oder flach", with the circle as the fallback whenever no outline is found.
