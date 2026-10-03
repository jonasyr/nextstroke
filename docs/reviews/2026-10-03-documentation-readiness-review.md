# Documentation Readiness Review

- **Status:** Complete; changes applied on branch `docs/phase-0-readiness-review`
- **Date:** 2026-10-03
- **Scope:** Consistency of the revised spec, decision log, project state, knowledge-base design, master plan, and phase plans after the independent feasibility review
- **Method:** Read every document in `docs/README.md` order, built a contradiction table, verified unstable technical claims against primary sources, and asked the owner to decide the genuine product tradeoffs

## 1. Repository state

- Documentation only. No application code, package manifests, CI, or fixtures exist.
- Five commits on `main`, the latest being `c77d880 docs: revise NextStroke plan after feasibility review`.
- The revised direction (D-022 to D-028) was consistently applied to the spec, project state, and plans. The remaining problems were in Phase 0 operational detail, a few contradictions, and missing owner decisions.

## 2. Review requirements

| # | Requirement | Before review | After review |
| --- | --- | --- | --- |
| 1 | Riskiest hypothesis tested in 1–2 weeks | Yes, but prerequisites and timebox end were undefined | 10-day timebox, prerequisites separated, missing evidence counts as unmet |
| 2 | Three strategies compared without cherry-picking | Attempt count, case success, and eligibility undefined | 3 attempts per case per strategy, all reported; S1 cannot be controlled |
| 3 | Exact GO, PIVOT, STOP | No STOP; mixed outcomes undefined | GO and PIVOT exact; no STOP by owner decision D-032 |
| 4 | Four artifact types distinguished | Yes; type definitions inconsistent | Consistent trust union, provenance, rejected type |
| 5 | Hard copyback outside editable and inside protected | Yes; mask priority and feather band undefined | Protected wins; feather band inside editable |
| 6 | No semantic safety from pixel ratios | Met | Unchanged |
| 7 | Memory-bounded iPhone processing and real-device tests | Budget "to be defined" | 2048 px working edge, 4096² canvas cap, device scope recorded |
| 8 | Quick Compare useful without AI | Met | Unchanged |
| 9 | Deferrals | Met; D-017 conflicted with D-024 | D-017 scoped to retained code |
| 10 | Knowledge-base provenance, confidence, licensing, offline | Confidence rules and dataset license missing | Confidence caps added; license and schemas listed as open before Phase 3 |
| 11 | "No controlled preview" outcome | Met | Unchanged |
| 12 | Realistic time and model-cost ranges | Time only; cost only in the review | Cost table added to master plan |

## 3. Contradictions and gaps

| Rank | Document / section | Conflicting or missing claim | Authority | Resolution |
| --- | --- | --- | --- | --- |
| BLOCKER | Spec §15; Phase 0 Task 6 | No STOP criteria; outcomes when neither GO nor PIVOT applies were undefined | Continuation prompt requirement 3 | Owner chose no STOP outcome (D-032); any unmet GO criterion is PIVOT |
| BLOCKER | Spec §15; Phase 0 Tasks 2, 6 | "Acceptable bounded preview", case, and attempt count undefined; "at least one" with unlimited seeds is best-of-N | Spec §15 | Defined case success over exactly 3 recorded attempts; first-attempt rate covers the "repeated attempts" trigger |
| BLOCKER | Spec §7 vs Phase 0 strategy 1 | Full composite counted toward GO although `ControlledOverlay.construction` excludes it | Spec §7, D-022 | S1 is baseline only and can be at most experimental; GO needs S2 or S3 |
| BLOCKER | Phase 0 Tasks 3, 6 | "Accepted", "acceptable", "controlled" used interchangeably; no classification rules | Spec §15 | Spec §15.2–15.3 define terms and the three classes |
| BLOCKER | Phase 0 Tasks 1, 4 | Budget, working-pixel budget, devices, raters required "before the run" but unset | Phase 0 plan | Pre-registered parameter table; budget D-031; devices D-034 |
| HIGH | Phase 0 Task 5 | Beginner gates could pass with developer-written instructions, so the product's generation was not tested; "sourced tool context" had no source | Spec §6.2 | Instructions come unedited from the frozen template; throwaway material sheet added |
| HIGH | Spec §15 corpus | 15 fineliner cases make 70% hinge on one case; 15 out-of-scope cases spend effort | D-023 | 30 fineliner (D-030) |
| HIGH | Phase 0 privacy | Third-party upload of participant art, retention, and consent content unspecified | AGENTS rule 7, spec §11 | Consent contents, training settings off, deletion date, named services |
| HIGH | Master plan vs Phase 0 | "1–2 weeks" and "without extending" vs pessimistic 3–4 weeks; recruitment not planned | D-024 | Prerequisites outside a 10-day execution timebox |
| HIGH | Project state #4 vs D-025 vs Phase 4 Task 3 | Experimental export: "not exportable" vs "warning or exclusion" | D-025 (ambiguous) | Burned-in warning only (D-033) |
| HIGH | Spec §8 | Feather band could extend outside editable region and break invariant 5; protected/editable priority unstated | AGENTS rule 5 | Feather band inside editable; protected wins; copyback at export resolution |
| MEDIUM | Spec §7 types | `trust: "untrusted"` not in `PreviewTrust`; no rejected type; no provenance despite §10 | Spec §10 | Types rewritten |
| MEDIUM | D-017 vs D-024 | Full monorepo and CI "from the start" vs disposable Phase 0 | D-024 newer | D-017 scope narrowed |
| MEDIUM | Knowledge base | No evidence-level to confidence rule; dataset license; paper schema | D-027 | Confidence caps added; rest listed as open before Phase 3 |
| MEDIUM | Master plan | No model or operating cost ranges | Requirement 12 | Cost table added |
| MEDIUM | Phase 0 | Review's line-survival and HEIC checks not carried over | Review §D | Added to Phase 0 Tasks 4 and 6 |
| MEDIUM | Spec §11 | "Retains no project asset" could be read as covering the provider | Verified provider docs | Provider retention disclosed separately |
| MEDIUM | Phase 4 Task 4 | Protecting a paid endpoint without accounts (denial of wallet) is unresolved | Spec §19 defers hosting/cost controls | Left open; must be designed before Phase 4 |
| LOW | AGENTS.md vs docs/README.md | Authority orders differ (ADRs, code comments) | docs/README.md | AGENTS.md aligned |
| LOW | docs/README.md table | Links to nonexistent `docs/privacy/`, `docs/roadmap/`, `CONTRIBUTING.md`; `docs/research/` missing | — | Marked as created later; research row added |
| LOW | Phase 3 vs Phase 4 | Checkpoint ownership duplicated | Master plan | Phase 3 owns checkpoints; Phase 4 adds preview state |
| LOW | Phase 3 | Careful/Balanced/Bold (D-014) not referenced | D-014 | Added to Phase 3 Task 3 |

## 4. Verified technical claims (2026-10-03)

| Claim | Verdict | Primary source |
| --- | --- | --- |
| GPT Image masks are prompt guidance, not exact | Verified: "may not follow its exact shape with complete precision" | developers.openai.com/api/docs/guides/image-generation |
| Edits return a full re-rendered image, not a delta | Verified | Same |
| Newest model is GPT Image 2 | Outdated: GPT Image 2.5 (`sunburst`, `flare`, snapshot 2026-09-08) is recommended for new integrations; transparent backgrounds fully supported on 2.5, preview on GPT Image 2 | OpenAI models and edit API reference |
| GPT Image 2 output at 1024²: about $0.006 / $0.053 / $0.211 | Verified for GPT Image 2; GPT Image 2.5 medium is about $0.013 output, plus input tokens | OpenAI image guide pricing |
| Image edits retained up to 30 days; zero data retention needs approval | Verified | developers.openai.com/api/docs/guides/your-data |
| No Element Fullscreen on iPhone | Verified; WebKit bug 206854 still NEW; MDN: iPad only | bugs.webkit.org/show_bug.cgi?id=206854 |
| WebKit storage is best effort and evicted per origin; `persist()` is heuristic | Verified (Safari 17 policy) | webkit.org/blog/14403 |
| Playwright WebKit is not shipped Safari | Verified | playwright.dev/docs/browsers |
| iOS canvas limit | Partly: MDN states 4096 × 4096; a total canvas memory cap has no primary source | MDN canvas element |
| Current iOS versions | iOS 27 (27.0.1) and iOS 26; both support iPhone 11 and later | support.apple.com/en-us/100100 |
| HEIC in iOS Safari | `<img>` supported since iOS 17; `createImageBitmap` unverified, so test on a device | caniuse |

The manual subscription route (D-031) means Phase 0 uses ChatGPT and Claude apps. Consumer apps have their own retention and training settings. The plan requires disabling training use and recording settings, but does not claim the consumer apps match API retention.

## 5. Owner decisions taken in this review

- D-030: Phase 0 corpus is 30 fineliner photographs.
- D-031: Phase 0 runs manually on existing ChatGPT and Claude subscriptions with no added spend.
- D-032: No STOP outcome; failed GO criteria lead to an owner-recorded PIVOT.
- D-033: Experimental inspiration exports only with a burned-in warning.
- D-034: Standardized starter drawings plus optional own work; current iPhone only, with the iPhone 11-class test deferred to the Phase 2 exit gate.
- D-035: Reduced manual effort (added after the owner asked to shorten Phase 0).

## 6. Consequences the owner should know before approving

1. **Manual evidence is weaker.** Model versions cannot be pinned, the cost criterion is an estimate, and blinding is partial. A GO from Phase 0 is provisional until Phase 4 reconfirms the retained strategy through the production API. That reconfirmation is the first required spend, about USD 10–20.
2. **Ten days of manual runs is tight.** The original design (30 cases × 3 strategies × 3 attempts plus 30 idea sets) meant roughly 15–25 hours of manual generation. D-035 (stop at first success, futility stop, 10-case S1 baseline, combined chats) reduces this to roughly 6–9 hours. If the timebox ends with missing evidence, those criteria count as unmet.
3. **The device gate is partial.** A clean run on a current iPhone says little about the iPhone 11's memory limits.
4. **Participant own work requires upload to consumer apps.** The consent template must say so explicitly.
5. **Values proposed by this review need confirmation:** the 90-day deletion limit for study data, the 2048 px working edge, "at least 10 cases with critical contours inside the editable region", and a 100 ms main-thread threshold.

## 7. Recommendation

**READY FOR OWNER REVIEW.** Every blocker now has a documented resolution, and every product tradeoff found has an owner decision. The Phase 0 plan is executable without further product decisions, but it is not approved. Execution needs the owner's explicit approval of the revised Phase 0 plan, including the proposed values in §6.5.
