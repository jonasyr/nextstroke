"""Candidate classification from spec §15.3."""

from __future__ import annotations

from dataclasses import dataclass
from enum import StrEnum


class Strategy(StrEnum):
    S1 = "s1-full-composite"
    S2 = "s2-transparent-overlay"
    S3 = "s3-structured-strokes"


OVERLAY_STRATEGIES = (Strategy.S2, Strategy.S3)


class Trust(StrEnum):
    CONTROLLED = "controlled"
    EXPERIMENTAL = "experimental"
    REJECTED = "rejected"


class CompositorBugError(RuntimeError):
    """A failed boundary audit means the compositor is broken; no label applies."""


@dataclass(frozen=True)
class Rubric:
    """Pass/fail rater judgements for one candidate (spec §15.2-15.3)."""

    on_task: bool
    readable: bool
    registered: bool
    correct_location: bool
    matches_change: bool
    no_critical_contour_destruction: bool
    layer_clean: bool
    fineliner_plausible: bool
    executable: bool
    understandable_in_isolation: bool

    @property
    def meets_controlled_bar(self) -> bool:
        return all(
            (
                self.correct_location,
                self.matches_change,
                self.no_critical_contour_destruction,
                self.layer_clean,
                self.fineliner_plausible,
                self.executable,
                self.understandable_in_isolation,
            )
        )


def classify(strategy: Strategy, *, audit_passed: bool, rubric: Rubric) -> Trust:
    if not audit_passed:
        raise CompositorBugError("boundary audit failed; fix the compositor before classifying")
    if not (rubric.on_task and rubric.readable and rubric.registered):
        return Trust.REJECTED
    if strategy in OVERLAY_STRATEGIES and rubric.meets_controlled_bar:
        return Trust.CONTROLLED
    return Trust.EXPERIMENTAL
