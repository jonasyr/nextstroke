# Handover: Phase 0 S1/S2 Run via OpenAI API

**Date:** 2026-10-03 · **Decision:** D-045 · **Branch to start from:** `main`

## State when this was written

- Corpus: 12 supplied images, 7 GO-eligible fineliner cases (c01–c07) plus comparison case c08, prepared and owner-approved (D-042, D-044). The case package (`cases/`, `manifest.json`, `review-sheet.jpg`, `prompts-per-case.md`, `outputs/`, `run/`, `attempts.jsonl`, `screening.json`) is private and is uploaded by the owner as a zip; it is never committed.
- Ideas and S3 strokes are done via contextless Claude subagents (D-045): all 8 idea sets have exactly three ideas; S3 attempt 1 passed the boundary audit on all 8 cases. Orchestrator screening: c01–c07 controlled on attempt 1 (7/7 GO cases); comparison case c08 experimental on all 3 attempts because its extra-protected lantern box is too wide and clips the right-hand rays (annotation issue, not model). Corrected comparison case c08b (narrower lantern box, logged as a post-hoc correction) screened controlled on attempt 1. 11 S3 attempts logged. Run S1/S2 for c08b instead of c08; c08 keeps its S3 record. Owner ratings are still pending.
- The OpenAI key is a proxy-injected credential in the new cloud environment for `api.openai.com`. It is never printed, requested, logged, or committed.

## Continuation prompt (paste into the new session)

> Continue NextStroke Phase 0 from `main`. Read `AGENTS.md`, `docs/project-state.md`, `docs/handoffs/2026-10-03-phase-0-openai-run.md`, and `lab/protocol/runbook.md`. Unzip the uploaded case package into `lab/private/` (git-ignored; never commit it, D-042). Rebuild the S3 candidates, which were left out of the zip for size: for every S3 line in `attempts.jsonl` run `uv run nextstroke-lab candidate private/cases/<case> s3 private/outputs/<case>-s3-<attempt>.json --attempt <attempt> --out private/candidates`. The OpenAI key is injected by the environment proxy for `api.openai.com`: never print or ask for it. Verify with a keyless `curl -s -o /dev/null -w "%{http_code}" https://api.openai.com/v1/models` (expect 200). Then, test-first and on a new branch, build a runner in `lab/` that calls the OpenAI Images API with GPT Image 2.5 for S2 (transparent overlay, `s2-v1`, up to 3 attempts per case, stop at the first controlled screening) and S1 (masked edit, `s1-v1`, one attempt per case, mask = the case's `editable.png` converted to the API's alpha-mask format), for the 8 annotated cases. Verify current request parameters in OpenAI's official docs before coding. Enforce a hard cost cap of USD 5 from measured `usage`, log every attempt to `attempts.jsonl` with measured latency and cost, then run `nextstroke-lab candidate` on each output, screen per `lab/protocol/rubric-de.md`, record screening in `screening.json`, and build two blinded rating packs (seeds 1 and 2) for the owner. Send the owner the updated package as a zip. Commit and merge only code and docs.

## Run result (2026-10-03)

Runner: `nextstroke-lab openai-run <private> <case> s1|s2 --attempt N` and `nextstroke-lab screen` (parameters in D-046). The owner's updated package (`nextstroke-phase0-cases-s1s2.zip`) holds `attempts.jsonl`, `screening.json`, `outputs/`, `pack-1/`, `pack-2/` and their keys. `candidates/` is left out for size again.

- **Spend:** 24 API calls, USD 0.53 measured (S2 16 calls USD 0.35, S1 8 calls USD 0.18), about USD 0.023 per call. Median latency 13 s, maximum 29 s.
- **Refusal:** c01 S2 attempt 1 was blocked by moderation (`abuse`) on a harmless sun-and-mountains drawing; logged as a failed attempt.
- **S2 screening, GO cases:** controlled for c04 and c05 on attempt 1 and for c02, c06 and c07 on attempt 2, so 5 of 7. Not controlled after 3 attempts: c01 (the ring is drawn larger than the sun disc and clipped into fragments by the protected lines) and c03 (water rings drawn away from the paddle ends). Common failure: the transparent layer is placed near, but not on, the target, and the boundary clip then cuts strokes.
- **S1 screening:** all 8 experimental (the rule caps S1 there). Several raw outputs redrew protected content: the kayak in c03 and the lanterns in c02 and c08b. Copyback restored it, but visible tonal seams remain at the editable box (c03, c06, c08b).
- **c08b (comparison only, mask not owner-reviewed):** S2 controlled on attempt 2, S1 experimental.
- **Rating packs:** seeds 1 and 2, 34 items each (11 S3 + 15 S2 + 8 S1), no shared item IDs. Limitation: S1 items show only the composite, so their structure reveals the strategy.

Rebuild `candidates/` after unzipping: run the S3 loop above, then for every `openai` line in `attempts.jsonl` with an output run `uv run nextstroke-lab candidate private/cases/<case> <s1|s2> private/<output_path> --attempt <attempt> --out private/candidates`.

## Open after the run

- Owner rates pack 1, then pack 2 the next day (Task 5). Compare the ratings with `screening.json`; S2 is a GO candidate only if the owner's ratings confirm 5 of 7.
- Beginner study (Task 7) and evidence file, then `nextstroke-lab decide --corpus-size 7`.
