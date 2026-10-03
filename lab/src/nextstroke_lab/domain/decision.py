"""Phase 0 GO/PIVOT evaluation from spec §15.4 (no STOP outcome, D-032)."""

from __future__ import annotations

from collections.abc import Mapping, Sequence
from dataclasses import dataclass, field
from enum import StrEnum
from math import ceil
from statistics import median

from nextstroke_lab.domain.classification import OVERLAY_STRATEGIES, Strategy, Trust

CORPUS_SIZE = 30  # planned default; D-044 allows the actual eligible count
GO_SHARE = 0.7
MAX_ATTEMPTS = 3
MAX_LATENCY_SECONDS = 60.0
MAX_COST_USD = 0.30


class Outcome(StrEnum):
    GO = "go"
    PIVOT = "pivot"


@dataclass(frozen=True)
class AttemptOutcome:
    trust: Trust
    critical_contour_destroyed: bool
    understandable_in_isolation: bool
    unnoticed_change: bool
    latency_seconds: float
    estimated_cost_usd: float


@dataclass(frozen=True)
class CaseOutcome:
    case_id: str
    attempts: Sequence[AttemptOutcome]
    mask_repaired: bool = False

    def __post_init__(self) -> None:
        if not 1 <= len(self.attempts) <= MAX_ATTEMPTS:
            raise ValueError(f"a case has 1 to {MAX_ATTEMPTS} attempts")
        controlled = [a.trust is Trust.CONTROLLED for a in self.attempts]
        if any(controlled[:-1]):
            raise ValueError("attempts stop at the first controlled result (D-035)")

    @property
    def succeeded(self) -> bool:
        return self.attempts[-1].trust is Trust.CONTROLLED

    @property
    def first_attempt_controlled(self) -> bool:
        return self.attempts[0].trust is Trust.CONTROLLED


@dataclass(frozen=True)
class StudyEvidence:
    participants: int
    understood: int
    not_worsened: int


@dataclass(frozen=True)
class DeviceEvidence:
    cycles_completed: int
    crashes_or_reloads: int


@dataclass(frozen=True)
class Decision:
    outcome: Outcome
    strategy: Strategy | None
    unmet: tuple[str, ...] = field(default=())
    triggers: tuple[str, ...] = field(default=())


def go_cases_needed(corpus_size: int) -> int:
    """Case successes GO needs: 70% of the corpus, rounded up (21 of 30, 5 of 7)."""
    if corpus_size < 1:
        raise ValueError("corpus size must be positive")
    return ceil(round(GO_SHARE * corpus_size, 9))


def is_futile(failed_cases: int, corpus_size: int = CORPUS_SIZE) -> bool:
    """A strategy cannot reach GO once more failures than the corpus can absorb."""
    return failed_cases > corpus_size - go_cases_needed(corpus_size)


def _strategy_findings(
    cases: Sequence[CaseOutcome], corpus_size: int
) -> tuple[list[str], list[str]]:
    unmet: list[str] = []
    triggers: list[str] = []
    wins = [c for c in cases if c.succeeded]
    needed = go_cases_needed(corpus_size)
    if len(wins) < needed:
        unmet.append(f"{len(wins)} case successes; GO needs {needed} of {corpus_size}")

    controlled = [a for c in cases for a in c.attempts if a.trust is Trust.CONTROLLED]
    if any(a.critical_contour_destroyed for a in controlled):
        unmet.append("critical contour destruction in a controlled candidate")
    understandable = sum(a.understandable_in_isolation for a in controlled)
    if not controlled or understandable * 10 < len(controlled) * 8:
        unmet.append("fewer than 80% of controlled candidates understandable in isolation")
    if controlled and sum(a.unnoticed_change for a in controlled) * 10 > len(controlled):
        triggers.append("more than 10% of controlled candidates had unnoticed changes")

    needs_work = sum(c.mask_repaired or not c.first_attempt_controlled for c in cases)
    needs_work += corpus_size - min(len(cases), corpus_size)
    if needs_work * 2 > corpus_size:
        triggers.append(
            "more than 50% of cases needed mask repair or a retry after the first attempt"
        )

    if wins:
        latency = median(sum(a.latency_seconds for a in c.attempts) for c in wins)
        cost = median(sum(a.estimated_cost_usd for a in c.attempts) for c in wins)
        if latency >= MAX_LATENCY_SECONDS:
            unmet.append(f"median latency {latency:.0f} s is not under {MAX_LATENCY_SECONDS:.0f} s")
        if cost >= MAX_COST_USD:
            unmet.append(f"median estimated cost USD {cost:.2f} is not under {MAX_COST_USD:.2f}")
    return unmet, triggers


def _shared_findings(
    study: StudyEvidence | None, device: DeviceEvidence | None, unreported_selection: bool
) -> tuple[list[str], list[str]]:
    unmet: list[str] = []
    if study is None or study.participants == 0:
        unmet.append("no beginner study evidence")
    else:
        if study.understood * 10 < study.participants * 7:
            unmet.append("fewer than 70% of participants understood the instruction")
        if study.not_worsened * 10 < study.participants * 6:
            unmet.append("fewer than 60% of participants executed without worsening the work")
    if device is None or device.cycles_completed < 10:
        unmet.append("ten-cycle real-device run incomplete")
    elif device.crashes_or_reloads:
        unmet.append("crash or reload in the real-device run")
    triggers = ["reported quality depends on unreported selection"] if unreported_selection else []
    return unmet, triggers


def decide(
    results: Mapping[Strategy, Sequence[CaseOutcome]],
    study: StudyEvidence | None,
    device: DeviceEvidence | None,
    unreported_selection: bool,
    corpus_size: int = CORPUS_SIZE,
) -> Decision:
    shared_unmet, shared_triggers = _shared_findings(study, device, unreported_selection)

    candidates: list[tuple[int, int, Strategy, list[str], list[str]]] = []
    for strategy in OVERLAY_STRATEGIES:
        if strategy not in results:
            continue
        cases = results[strategy]
        unmet, triggers = _strategy_findings(cases, corpus_size)
        wins = sum(c.succeeded for c in cases)
        candidates.append((len(unmet) + len(triggers), -wins, strategy, unmet, triggers))

    s1_usable = any(
        a.trust is Trust.EXPERIMENTAL for c in results.get(Strategy.S1, ()) for a in c.attempts
    )
    no_overlay_success = not any(
        c.succeeded for s in OVERLAY_STRATEGIES for c in results.get(s, ())
    )
    if s1_usable and no_overlay_success:
        shared_triggers.append("S2 and S3 failed while S1 is the only usable visual route")

    if not candidates:
        return Decision(
            Outcome.PIVOT,
            None,
            ("no S2 or S3 results", *shared_unmet),
            tuple(shared_triggers),
        )

    _, _, best, unmet, triggers = min(candidates, key=lambda c: (c[0], c[1]))
    all_unmet = tuple(unmet + shared_unmet)
    all_triggers = tuple(triggers + shared_triggers)
    outcome = Outcome.GO if not all_unmet and not all_triggers else Outcome.PIVOT
    return Decision(outcome, best, all_unmet, all_triggers)
