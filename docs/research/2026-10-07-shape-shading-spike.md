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

## Result

(open)
