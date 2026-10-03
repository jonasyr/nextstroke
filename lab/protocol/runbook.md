# Phase 0 Runbook

Operational checklist for the approved plan (`docs/superpowers/plans/2026-10-03-nextstroke-phase-0-proof-of-feasibility.md`). The plan and spec §15 win if this file disagrees.

## Before day 1

- [ ] ChatGPT: Settings → Data controls → turn off model improvement. Claude: Settings → Privacy → turn off training use. Note date and state in `private/settings.md`.
- [ ] Create `lab/private/` (git-ignored) with `cases/`, `outputs/`, `candidates/`, `keys/`.
- [ ] Commit the material sheet (Task 2a) and freeze `protocol/prompts.md`.
- [ ] Create the Claude Project with the `ideas-s3-v1` instructions, the stroke schema from `stroke-plan.schema.json`, and the material sheet.
- [ ] Deploy `lab/probe` privately on ChatGPT Sites and run it on the iPhone (Task 6 can start early).
- [ ] Signed consent (`consent-de.md`) for every person whose artwork or session data is used.

## Corpus preparation (Task 1)

1. Photograph each work handheld as usual; export JPEG (Settings → Camera → Formats → Most Compatible, or share as JPEG).
2. Crop to 3:2 (landscape or portrait) so ChatGPT outputs (1536×1024 / 1024×1536) can be registered without guessing. Keep the uncropped photo too.
3. Save as `private/cases/cNN/original.jpg`.
4. Paint masks at the same size: `editable.png` (white = may change), `protected.png` (white = critical contours that must not change), optional `feather.png` (white band inside editable).
5. Add a manifest line: id, kind (`hand` or `printed` + source URL + license), lighting, paper, perspective, desired change, protected description, critical contours inside editable (yes/no), S1 subset (yes/no).

## Generation (Tasks 2–3)

- Per case: Claude ideas + S3 (one chat), then S2 in ChatGPT, then S1 for the 10 pre-selected cases.
- After each S2/S3 attempt run `nextstroke-lab candidate …` and screen against the rubric. Stop at the first result that screens controlled (D-035); otherwise up to 3 attempts.
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
