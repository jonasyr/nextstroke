from dataclasses import replace

import pytest

from nextstroke_lab.domain.classification import (
    CompositorBugError,
    Rubric,
    Strategy,
    Trust,
    classify,
)

PASSING = Rubric(
    on_task=True,
    readable=True,
    registered=True,
    correct_location=True,
    matches_change=True,
    no_critical_contour_destruction=True,
    layer_clean=True,
    fineliner_plausible=True,
    executable=True,
    understandable_in_isolation=True,
)


@pytest.mark.parametrize("strategy", [Strategy.S2, Strategy.S3])
def test_overlay_passing_everything_is_controlled(strategy: Strategy) -> None:
    assert classify(strategy, audit_passed=True, rubric=PASSING) is Trust.CONTROLLED


def test_full_composite_is_never_controlled() -> None:
    assert classify(Strategy.S1, audit_passed=True, rubric=PASSING) is Trust.EXPERIMENTAL


@pytest.mark.parametrize(
    "criterion",
    [
        "correct_location",
        "matches_change",
        "no_critical_contour_destruction",
        "layer_clean",
        "fineliner_plausible",
        "executable",
        "understandable_in_isolation",
    ],
)
def test_failing_one_rubric_criterion_makes_overlay_experimental(criterion: str) -> None:
    rubric = replace(PASSING, **{criterion: False})
    assert classify(Strategy.S3, audit_passed=True, rubric=rubric) is Trust.EXPERIMENTAL


@pytest.mark.parametrize("criterion", ["on_task", "readable", "registered"])
@pytest.mark.parametrize("strategy", list(Strategy))
def test_off_task_unreadable_or_unregistered_is_rejected(
    criterion: str, strategy: Strategy
) -> None:
    rubric = replace(PASSING, **{criterion: False})
    assert classify(strategy, audit_passed=True, rubric=rubric) is Trust.REJECTED


def test_failed_boundary_audit_is_a_bug_not_a_label() -> None:
    with pytest.raises(CompositorBugError):
        classify(Strategy.S2, audit_passed=False, rubric=PASSING)
