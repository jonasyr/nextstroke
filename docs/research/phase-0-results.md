# Phase 0 Results

**Date:** 2026-10-03 · **Outcome:** PIVOT · **Owner decision:** D-048 · **Plan:** `docs/superpowers/plans/2026-10-03-nextstroke-phase-0-proof-of-feasibility.md`

## Summary

S3 (structured strokes rendered locally) met every technical GO criterion on the supplied corpus: 6 of 7 cases controlled, all on the first attempt, no critical contour destroyed, every controlled candidate understandable in isolation, median 32 s and about USD 0.02 per success. S2 (transparent overlay from GPT Image 2.5) reached exactly the bar, 5 of 7. S1 produced no controlled result, by rule, and three of its candidates were rejected. Phase 0 still ends in PIVOT because no beginner study was run, and spec §15.4 counts missing evidence as unmet. The owner selected the pivot: retain S3 only and move the beginner criteria to the Phase 3 exit gate (D-048).

The evidence is thin. Seven web-sourced cases, one rater, one rating round, and an orchestrator that knew the masks. Treat this as a feasibility signal, not a quality measurement.

## Method and deviations

| Planned | Actual | Decision |
| --- | --- | --- |
| 30 handheld iPhone photos | 12 supplied images; 7 fineliner cases count toward GO, 5 comparison-only | D-044 |
| Owner's and volunteers' works | Pinterest drawings, kept private | D-042 |
| Manual runs in subscriptions | S3 and ideas via contextless Claude subagents; S1/S2 via OpenAI Images API (`gpt-image-2.5-sunburst`, medium), USD 5 cap | D-045, D-046 |
| Owner screens for stop-at-first-success | Orchestrating agent screened; owner rated afterwards | D-045 |
| Two blinded rating rounds, second the next day | One round, rated on the phone via a private page with the same blinded IDs | D-047 |
| Beginner study with 5–8 participants | Not run | D-048 |
| Ten-cycle device run plus background/resume, HEIC, 48 MP | First probe run accepted (ten 12 MP cycles, no crash); rest moved to Phase 2 exit | D-043 |

Additional deviations:

- The comparison case c08 had an over-wide protected box; a corrected copy c08b was added after the fact. Its mask is not owner-reviewed. Neither counts toward GO.
- `decide` ignores attempts after the first one the owner rated controlled (S2 c02 and c07 had a second attempt only because the orchestrator screened stricter). Conversely, S3 c06 got one attempt because the orchestrator screened it controlled and the owner did not; under the owner's rating it would have had two more attempts. S3 would have needed none of them to pass.
- S3 cost is an estimate (USD 0.02 per attempt); subagent latency includes file reads and writes.

## Corpus

All seven GO cases are web-sourced fineliner drawings: three phone photos, two scan-like images, one app screenshot, one photo with a light blue wash. No case is a handheld photo of a beginner's started work, which is what the product targets. Results are therefore not split by source; there is only one.

## Outcomes per strategy (GO cases c01–c07, owner ratings)

| Case | S3 | S2 | S1 |
| --- | --- | --- | --- |
| c01 | controlled @1 | refused, rejected, rejected | rejected |
| c02 | controlled @1 | controlled @1 | rejected |
| c03 | controlled @1 | experimental, rejected, experimental | rejected |
| c04 | controlled @1 | controlled @1 | experimental |
| c05 | controlled @1 | controlled @1 | experimental |
| c06 | experimental (1 attempt) | experimental, controlled @2 | experimental |
| c07 | controlled @1 | controlled @1 | experimental |
| **Case successes** | **6 / 7** | **5 / 7** | 0 / 7 |

No futility stop was reached. `decide --corpus-size 7 --cases c01..c07` result: `pivot`, best strategy S3, unmet "no beginner study evidence", no triggers.

| Criterion (spec §15.4) | S3 | Status |
| --- | --- | --- |
| ≥ 70% case successes (5 of 7) | 6 of 7 | met |
| No critical contour destruction in controlled | 0 of 6 | met |
| ≥ 80% controlled understandable in isolation | 6 of 6 | met |
| ≥ 70% participants understand | no study | **unmet** |
| ≥ 60% participants do not worsen the work | no study | **unmet** |
| No crash in ten-cycle device run | 10 cycles, 0 crashes | met |
| Median latency < 60 s, cost < USD 0.30 per success | 31.6 s, USD 0.02 | met |
| Unnoticed changes ≤ 10% | not measured (no second round) | unknown |

## Failure categories

- **S2:** placement near but not on the target, then cut by the boundary clip (c01 ring larger than the sun disc, c03 rings away from the paddle ends, c02/c08b ray bundles offset). Failed criteria across non-controlled S2 candidates: matches change 4, correct location 3, readable 2, understandable 2. One moderation refusal (`abuse`) on a harmless drawing.
- **S1:** the model redraws protected content (the kayak in c03, the lanterns in c02 and c08b); copyback restores it but leaves tonal seams. Rated not fineliner-plausible or not clean in two cases.
- **S3:** one wrong location (c06).

## Cost and latency

| | Calls | Measured cost | Latency min / median / max |
| --- | ---: | ---: | --- |
| S2 + S1 (OpenAI API) | 24 (1 refused) | USD 0.53 total, about USD 0.023 per call | 11.6 / 13.4 / 29.4 s |
| S3 (subagents) | 11 | estimate about USD 0.02 per attempt | 27.9 / 31.8 / 43.0 s |

## Rater agreement

There was no second rater. The orchestrator's screening differed from the owner's rating on 13 of 34 candidates; 5 of those crossed the controlled line (owner stricter on S2 c02 attempt 2, S2 c08b attempt 2 and S3 c06; more lenient on S2 c02 attempt 1 and S2 c07 attempt 1).

## Device

See `docs/research/2026-10-03-sites-probe-iphone.md`. Passed on the owner's iPhone 13 mini. Open until the Phase 2 exit gate: iPhone 11 class, background/resume during processing, 24/48 MP and HEIC inputs, `persist()`.

## Limitations

- 7 GO cases; one case moves the success rate by 14 points.
- All cases are web-sourced, mostly finished and clean drawings, not beginners' handheld photos.
- One rater, one round; unnoticed changes and rating consistency are unmeasured.
- The orchestrating agent wrote the annotations' drafts and screened attempts while knowing the masks; the subagents generating S3 did not see the masks.
- S3 ran through the session model in contextless subagents, not a pinned production API model; Phase 4 must reconfirm it through the production path on a fresh holdout.
- No beginner evidence at all: whether instructions and previews help a beginner draw is untested.

## Recommendation and owner decision

Recommendation: retain S3 as the only controlled-preview route; do not retain S2 (no margin, placement failures, refusal risk); keep S1 only as labeled experimental inspiration. Run the beginner study as early as a usable coach exists.

Owner decision (D-048, 2026-10-03): PIVOT with S3 retained. The beginner criteria (≥ 70% understand, ≥ 60% do not worsen) become a hard Phase 3 exit gate; no Phase 4 preview work and no public test before they pass. Phase 1 may start.
