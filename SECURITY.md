# Security

## Reporting

Report vulnerabilities privately through GitHub's "Report a vulnerability" (Security tab of `jonasyr/nextstroke`). Do not open a public issue, and do not attach artwork or personal photos.

## Rules for this repository

- No secrets in the repository, the web bundle, logs or chat. Phase 0 used an OpenAI key injected by the cloud environment's proxy; Phase 4 keeps provider keys server-side (spec §13, D-038 Worker mode).
- Provider outputs are untrusted input: validate their structure at runtime and never promote them to controlled overlays (spec §7).
- The static app needs no custom response headers; anything that requires them is a design change (D-038).
- `detect-private-key` runs in pre-commit; CI runs the full check suite on every push to `main` and on pull requests.
