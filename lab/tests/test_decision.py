from dataclasses import replace

import pytest

from nextstroke_lab.domain.classification import Strategy, Trust
from nextstroke_lab.domain.decision import (
    CORPUS_SIZE,
    AttemptOutcome,
    CaseOutcome,
    DeviceEvidence,
    Outcome,
    StudyEvidence,
    decide,
    is_futile,
)

GOOD = AttemptOutcome(
    trust=Trust.CONTROLLED,
    critical_contour_destroyed=False,
    understandable_in_isolation=True,
    unnoticed_change=False,
    latency_seconds=30.0,
    estimated_cost_usd=0.05,
)
BAD = replace(GOOD, trust=Trust.EXPERIMENTAL)
STUDY = StudyEvidence(participants=8, understood=7, not_worsened=6)
DEVICE = DeviceEvidence(cycles_completed=10, crashes_or_reloads=0)


def _cases(successes: int, *, first_try: bool = True) -> list[CaseOutcome]:
    win = [GOOD] if first_try else [BAD, GOOD]
    return [
        CaseOutcome(f"c{i:02}", attempts=win if i < successes else [BAD, BAD, BAD])
        for i in range(CORPUS_SIZE)
    ]


def test_go_when_one_overlay_strategy_meets_every_criterion() -> None:
    decision = decide({Strategy.S3: _cases(21)}, STUDY, DEVICE, unreported_selection=False)
    assert decision.outcome is Outcome.GO
    assert decision.strategy is Strategy.S3
    assert decision.unmet == ()


def test_twenty_successes_is_not_enough() -> None:
    decision = decide({Strategy.S3: _cases(20)}, STUDY, DEVICE, unreported_selection=False)
    assert decision.outcome is Outcome.PIVOT
    assert any("21" in reason for reason in decision.unmet)


def test_full_composite_cannot_produce_go_and_flags_only_route() -> None:
    s1 = [CaseOutcome(f"c{i}", [replace(GOOD, trust=Trust.EXPERIMENTAL)]) for i in range(10)]
    decision = decide(
        {Strategy.S1: s1, Strategy.S2: _cases(0), Strategy.S3: _cases(0)},
        STUDY,
        DEVICE,
        unreported_selection=False,
    )
    assert decision.outcome is Outcome.PIVOT
    assert any("S1" in t for t in decision.triggers)


def test_critical_contour_destruction_blocks_go() -> None:
    cases = _cases(25)
    cases[0] = CaseOutcome("c00", [replace(GOOD, critical_contour_destroyed=True)])
    decision = decide({Strategy.S2: cases}, STUDY, DEVICE, unreported_selection=False)
    assert decision.outcome is Outcome.PIVOT


def test_understandability_below_eighty_percent_blocks_go() -> None:
    cases = _cases(25)
    for i in range(6):
        cases[i] = CaseOutcome(f"c{i:02}", [replace(GOOD, understandable_in_isolation=False)])
    decision = decide({Strategy.S2: cases}, STUDY, DEVICE, unreported_selection=False)
    assert decision.outcome is Outcome.PIVOT


@pytest.mark.parametrize(
    ("study", "device"),
    [
        (StudyEvidence(participants=8, understood=5, not_worsened=8), DEVICE),
        (StudyEvidence(participants=8, understood=8, not_worsened=4), DEVICE),
        (StudyEvidence(participants=0, understood=0, not_worsened=0), DEVICE),
        (STUDY, DeviceEvidence(cycles_completed=10, crashes_or_reloads=1)),
        (STUDY, DeviceEvidence(cycles_completed=7, crashes_or_reloads=0)),
        (None, DEVICE),
        (STUDY, None),
    ],
)
def test_study_or_device_failure_or_missing_evidence_blocks_go(
    study: StudyEvidence | None, device: DeviceEvidence | None
) -> None:
    decision = decide({Strategy.S3: _cases(30)}, study, device, unreported_selection=False)
    assert decision.outcome is Outcome.PIVOT


def test_slow_or_expensive_previews_block_go() -> None:
    slow = [
        CaseOutcome(c.case_id, [replace(a, latency_seconds=61.0) for a in c.attempts])
        for c in _cases(30)
    ]
    pricey = [
        CaseOutcome(c.case_id, [replace(a, estimated_cost_usd=0.31) for a in c.attempts])
        for c in _cases(30)
    ]
    for cases in (slow, pricey):
        assert decide({Strategy.S3: cases}, STUDY, DEVICE, False).outcome is Outcome.PIVOT


def test_latency_and_cost_include_failed_attempts_before_success() -> None:
    cases = [
        CaseOutcome(
            f"c{i}", [replace(BAD, latency_seconds=40.0), replace(GOOD, latency_seconds=25.0)]
        )
        for i in range(CORPUS_SIZE)
    ]
    decision = decide({Strategy.S3: cases}, STUDY, DEVICE, False)
    assert any("latency" in reason for reason in decision.unmet)


def test_unnoticed_changes_above_ten_percent_trigger_pivot() -> None:
    cases = _cases(30)
    for i in range(4):
        cases[i] = CaseOutcome(f"c{i:02}", [replace(GOOD, unnoticed_change=True)])
    decision = decide({Strategy.S3: cases}, STUDY, DEVICE, unreported_selection=False)
    assert decision.outcome is Outcome.PIVOT
    assert any("unnoticed" in t for t in decision.triggers)


def test_majority_needing_retries_triggers_pivot() -> None:
    decision = decide(
        {Strategy.S3: _cases(30, first_try=False)}, STUDY, DEVICE, unreported_selection=False
    )
    assert decision.outcome is Outcome.PIVOT
    assert any("first attempt" in t for t in decision.triggers)


def test_unreported_selection_invalidates_go() -> None:
    decision = decide({Strategy.S3: _cases(30)}, STUDY, DEVICE, unreported_selection=True)
    assert decision.outcome is Outcome.PIVOT


def test_missing_cases_count_as_failures() -> None:
    decision = decide({Strategy.S3: _cases(30)[:20]}, STUDY, DEVICE, unreported_selection=False)
    assert decision.outcome is Outcome.PIVOT


def test_no_overlay_results_at_all_is_pivot() -> None:
    decision = decide({}, STUDY, DEVICE, unreported_selection=False)
    assert decision.outcome is Outcome.PIVOT
    assert decision.strategy is None


@pytest.mark.parametrize(("failed", "futile"), [(9, False), (10, True), (12, True)])
def test_futility_after_ten_failed_cases(failed: int, futile: bool) -> None:
    assert is_futile(failed) is futile


def test_too_many_attempts_rejected() -> None:
    with pytest.raises(ValueError, match="attempts"):
        CaseOutcome("c", [BAD, BAD, BAD, GOOD])
    with pytest.raises(ValueError, match="attempts"):
        CaseOutcome("c", [])


def test_attempts_after_success_rejected() -> None:
    with pytest.raises(ValueError, match="first"):
        CaseOutcome("c", [GOOD, BAD])
