# Decision Documentation

## Decision log versus ADR

Append to `decision-log.md` for product selections, scope choices, UX policy, rollout policy, naming, and other decisions where a concise record is sufficient.

Create a numbered Architecture Decision Record for a technical choice that:

- changes package or service boundaries;
- commits the project to an external provider or data store;
- changes privacy, security, or deletion behavior;
- is expensive to reverse;
- affects more than one implementation phase.

Use the next four-digit number and the filename `NNNN-short-title.md`. Each ADR contains status, context, options, decision, consequences, and reconsideration triggers. Superseded ADRs remain in the repository and link to their replacement.

## Required update rule

The same pull request that implements a new decision must update the decision log or add/supersede an ADR. Do not rely on a model conversation, issue, or commit message as the only record.
