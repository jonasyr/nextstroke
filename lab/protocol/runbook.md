# Phase 0 Runbook

Operational checklist for the approved plan (`docs/superpowers/plans/2026-10-03-nextstroke-phase-0-proof-of-feasibility.md`). The plan and spec §15 win if this file disagrees.

## Before day 1

- [ ] ChatGPT: Settings → Data controls → turn off model improvement. Claude: Settings → Privacy → turn off training use. Note date and state in `private/settings.md`.
- [ ] Create `lab/private/` (git-ignored) with `cases/`, `outputs/`, `candidates/`, `keys/`.
- [x] Material sheet drafted (Task 2a): `protocol/material-sheet.json`, 43 manufacturer claims (evidence B, at most medium confidence) and 7 generic caution rules, validated by tests. Owner review pending; add the pens actually used in the study if missing.
- [ ] Freeze `protocol/prompts.md`.
- [ ] Create the Claude Project with the `ideas-s3-v1` instructions, the stroke schema from `stroke-plan.schema.json`, and the material sheet.
- [ ] Deploy `lab/probe` privately on ChatGPT Sites and run it on the iPhone (Task 6 can start early).
- [ ] Signed consent (`consent-de.md`) for every person whose artwork or session data is used.

## Corpus preparation (Task 1)

1. Save the source image privately (`private/sources/`). Pinterest pins (D-042) work as JPEG, PNG, or WebP. Better: print some pins on drawing paper and photograph them handheld, so the case has real paper, light, and perspective. iPhone photos: Settings → Camera → Formats → Most Compatible.
2. Run `uv run nextstroke-lab prepare private/sources/<file> --case-dir private/cases/cNN`. It applies orientation and sRGB, scales to at most 2048 px, center-crops to 3:2 so ChatGPT outputs (1536×1024 / 1024×1536) can be registered, and writes `original.png` plus blank `editable.png` and `protected.png`. Check that the crop kept the important part; if not, crop the source by hand first.
3. Draft masks with `uv run nextstroke-lab annotate private/cases/cNN --editable '<normalized polygons JSON>' --change '<desired change>' --protect-note '<what must not change>'`. Existing ink inside or near the editable region is protected automatically (a fineliner cannot erase); add `--extra-protected` polygons for anything else. Check all cases at once with `uv run nextstroke-lab sheet private/cases --out private/review-sheet.png` (green = editable, red = protected), then set `owner_reviewed` to true in each `annotation.json`. On textured or watercolor paper, raise `--ink-offset` (for example 55) if paper grain shows up as red speckle. Masks may also be painted by hand over the blank templates at the same size: `editable.png` (white = may change), `protected.png` (white = critical contours that must not change), optional `feather.png` (white band inside editable).
4. Add a manifest line: id, source (`web` + pin URL, `printed` + URL + license, `own`, or `volunteer`), photographed by hand (yes/no), lighting, paper, perspective, desired change, protected description, critical contours inside editable (yes/no), S1 subset (yes/no).

## Generation (Tasks 2–3)

- Generate copy-ready prompts per case: `uv run nextstroke-lab prompts private/cases --out private/prompts-per-case.md`.

- Per case: Claude ideas + S3 (one chat), then S2 in ChatGPT, then S1 for the 10 pre-selected cases.
- After each S2/S3 attempt run `nextstroke-lab candidate …` and screen against the rubric. Stop at the first result that screens controlled (D-035); otherwise up to 3 attempts.
- API route (D-045, D-046): `uv run nextstroke-lab openai-run private <case> s2 --attempt N` builds the candidate itself; screen it with `uv run nextstroke-lab screen private <case> s2 N controlled|experimental|rejected --note '…'` before the next attempt is allowed. S1: `openai-run private <case> s1 --attempt 1`. The runner refuses calls that could pass the USD 5 cap.
- Stop a strategy after 10 failed cases (futility) and note the case where it stopped.
- Log every attempt, including refusals and unusable outputs.

## Rating (Task 5)

1. `nextstroke-lab pack` with seed 1 → rate everything → export `ratings-1.json`.
2. Next day: `nextstroke-lab pack` with seed 2 (new IDs) → re-rate → `ratings-2.json`. Downgrades become "unnoticed changes".
3. A second rater, if available, rates at least a third of the candidates in their own pack; the stricter rating wins.

## Decision (Task 8)

Fill `private/evidence.json` from the study and probe, then run `nextstroke-lab decide`. Copy the JSON report into `docs/research/phase-0-results.md` with the limitations listed in the plan.

## Cost basis

Use API-equivalent estimates from published prices on the run date and note the source: for example OpenAI GPT Image 2.5 medium 1024² ≈ USD 0.013 output plus input tokens (checked 2026-10-03), so roughly USD 0.02–0.04 per image attempt; text-only S3 attempts cost cents.
