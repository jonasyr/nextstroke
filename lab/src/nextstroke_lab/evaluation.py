"""Join ratings, re-review, attempt log, and audits into Phase 0 outcomes."""

from __future__ import annotations

import json
from collections import defaultdict
from collections.abc import Collection, Mapping, Sequence
from pathlib import Path

from nextstroke_lab.adapters.attempt_log import AttemptRecord
from nextstroke_lab.domain.classification import Rubric, Strategy, Trust, classify
from nextstroke_lab.domain.decision import AttemptOutcome, CaseOutcome

Triple = tuple[str, Strategy, int]


class EvaluationError(ValueError):
    pass


def load_key(path: Path) -> dict[str, Triple]:
    raw: dict[str, dict[str, object]] = json.loads(path.read_text(encoding="utf-8"))
    return {
        item_id: (str(v["case_id"]), Strategy(str(v["strategy"])), int(str(v["attempt"])))
        for item_id, v in raw.items()
    }


def rubrics_by_candidate(key: Mapping[str, Triple], ratings_path: Path) -> dict[Triple, Rubric]:
    ratings: dict[str, dict[str, object]] = json.loads(ratings_path.read_text(encoding="utf-8"))
    result: dict[Triple, Rubric] = {}
    for item_id, triple in key.items():
        if item_id not in ratings:
            raise EvaluationError(f"unrated candidate {item_id}")
        rubric = ratings[item_id]["rubric"]
        if not isinstance(rubric, dict):
            raise EvaluationError(f"malformed rating {item_id}")
        result[triple] = Rubric(**{k: bool(v) for k, v in rubric.items()})
    return result


def read_audits(root: Path) -> dict[Triple, bool]:
    audits: dict[Triple, bool] = {}
    for path in sorted(root.glob("*/*/*/audit.json")):
        attempt_dir = path.parent
        triple = (
            attempt_dir.parent.parent.name,
            Strategy(attempt_dir.parent.name),
            int(attempt_dir.name),
        )
        audits[triple] = bool(json.loads(path.read_text(encoding="utf-8"))["passed"])
    return audits


def build_outcomes(  # noqa: PLR0913 - the evidence sources stay explicit
    records: Sequence[AttemptRecord],
    audits: Mapping[Triple, bool],
    first: Mapping[Triple, Rubric],
    final: Mapping[Triple, Rubric] | None,
    cost_per_attempt: Mapping[Strategy, float],
    *,
    cases: Collection[str] | None = None,
) -> tuple[dict[Strategy, list[CaseOutcome]], dict[Strategy, int]]:
    """Return outcomes per strategy and the count of unnoticed changes per strategy.

    Only `cases` are evaluated when given (D-044: comparison cases do not count). Measured
    cost from the log wins over the flat per-strategy estimate. Attempts after the first one
    rated controlled are ignored: D-035 stops there, so they only exist because a stricter
    screening missed the success.
    """
    grouped: dict[tuple[str, Strategy], list[AttemptRecord]] = defaultdict(list)
    for record in records:
        if cases is not None and record.case_id not in cases:
            continue
        grouped[(record.case_id, record.strategy)].append(record)

    outcomes: dict[Strategy, list[CaseOutcome]] = defaultdict(list)
    unnoticed: dict[Strategy, int] = defaultdict(int)
    for (case_id, strategy), attempts in sorted(grouped.items()):
        results: list[AttemptOutcome] = []
        for record in sorted(attempts, key=lambda r: r.attempt):
            if results and results[-1].trust is Trust.CONTROLLED:
                break
            triple = record.key
            cost = (
                record.cost_usd
                if record.cost_usd is not None
                else cost_per_attempt.get(strategy, 0.0)
            )
            if record.failure is not None:
                results.append(
                    AttemptOutcome(
                        Trust.REJECTED, False, False, False, record.latency_seconds, cost
                    )
                )
                continue
            if triple not in audits or triple not in first:
                raise EvaluationError(f"logged attempt {triple} has no composite or rating")
            first_trust = classify(strategy, audit_passed=audits[triple], rubric=first[triple])
            rubric = final[triple] if final is not None else first[triple]
            trust = classify(strategy, audit_passed=audits[triple], rubric=rubric)
            changed = first_trust is Trust.CONTROLLED and trust is not Trust.CONTROLLED
            unnoticed[strategy] += changed
            results.append(
                AttemptOutcome(
                    trust=trust,
                    critical_contour_destroyed=not rubric.no_critical_contour_destruction,
                    understandable_in_isolation=rubric.understandable_in_isolation,
                    unnoticed_change=changed,
                    latency_seconds=record.latency_seconds,
                    estimated_cost_usd=cost,
                )
            )
        outcomes[strategy].append(CaseOutcome(case_id, results))
    return dict(outcomes), dict(unnoticed)
