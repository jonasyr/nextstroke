# Privacy Model and Data Flow

Canonical location for privacy (docs/README.md). Governing rules: spec §11, AGENTS rules 1–10, D-026, D-038, D-051. **Updated:** 2026-10-03.

## What stays on the device

- Originals, references, checkpoints, masks, projects and exports are stored locally (IndexedDB, best effort; the UI explains eviction and offers export). There are no accounts and no cloud sync in `v0.1`.
- Quick Compare works without network, account or AI.
- The service worker caches only the app shell. It never caches user artwork, blobs or provider traffic (`apps/web/src/sw/policy.ts`).
- No user image or image-derived description enters logs or analytics.

## What leaves the device, and when

| Data | Destination | When | Notes |
| --- | --- | --- | --- |
| Page requests (no images) | ChatGPT Sites hosting | Every visit | Sites records traffic analytics (visitors, page views) automatically and offers no data residency (D-038). |
| Confirmed working crop, masks, task text | Image-edit provider (OpenAI) for the S1 template, Phase 4 | Only after an explicit, explained user action | Provider retention as the provider documents it: OpenAI states up to 30 days of abuse-monitoring retention for image edits unless zero data retention is approved (verified 2026-10-03). Never described as "not retained". |
| The same crop plus the template image | Stroke-plan model for the S3 transfer, Phase 4 | Same request (D-051) | Same disclosure rule for that provider. |

A NextStroke server, if Phase 4 needs one for secrets, keeps no project asset by default and documents its deletion window. Provider outputs are untrusted assets and never become accepted change layers.

## Rules for contributors

- Never commit user artwork, corpus images, provider responses with personal images, secrets, or image-content telemetry (AGENTS rule 9).
- Every new external service, retention change or new data flow updates this file, the spec and the decision log in the same change.
