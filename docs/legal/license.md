# License Decision Note

**Status:** decided, not yet applied. **Decision:** D-016 (AGPL-3.0). **Updated:** 2026-10-03.

- The code is intended to be licensed under AGPL-3.0-only (D-016). The Phase 0 lab already declares `AGPL-3.0-only` in `lab/pyproject.toml`.
- The repository does not yet contain a `LICENSE` file. Until the owner adds one, the public repository grants no license. Spec §19 makes the license subject to a dependency and distribution review before release.
- Production dependencies are checked against an allowlist on every `pnpm run check` (`scripts/check_licenses.mjs`): MIT, Apache-2.0, ISC, BSD-2/3-Clause, 0BSD, CC0-1.0, BlueOak-1.0.0, and LGPL-3.0 for `heic-to` only (unmodified, lazy-loaded; spec §13.2). An automated scan is not a legal review (independent review, item 30).
- The curated material dataset needs its own license for facts and paraphrases, separate from the code license (`docs/product/material-knowledge-base.md`).
- User artwork, Phase 0 corpus images, provider outputs and the legacy demo images are not covered by the code license and must not be used as fixtures without their own license (AGENTS rule 9, D-042).

Open: the owner adds the AGPL-3.0 `LICENSE` file and decides the dataset license before the first public release.
