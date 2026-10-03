import json
from datetime import UTC, datetime
from pathlib import Path

import pytest
from PIL import Image

from nextstroke_lab.adapters.attempt_log import AttemptRecord
from nextstroke_lab.cli import main
from nextstroke_lab.domain.classification import Rubric, Strategy, Trust
from nextstroke_lab.evaluation import EvaluationError, build_outcomes, rubrics_by_candidate

RUBRIC = Rubric(*([True] * 10))


def _record(attempt: int, failure: str | None = None) -> AttemptRecord:
    return AttemptRecord(
        case_id="c01",
        strategy=Strategy.S2,
        attempt=attempt,
        service="chatgpt",
        model_label="ChatGPT",
        prompt_revision="s2-v1",
        started_at=datetime(2026, 10, 5, tzinfo=UTC),
        latency_seconds=40.0,
        output_path=None if failure else "x.png",
        output_sha256=None if failure else "0" * 64,
        failure=failure,
    )


def test_failed_attempt_counts_as_rejected_with_its_latency() -> None:
    triple = ("c01", Strategy.S2, 2)
    outcomes, _ = build_outcomes(
        [_record(1, failure="refused"), _record(2)],
        {triple: True},
        {triple: RUBRIC},
        None,
        {Strategy.S2: 0.03},
    )
    case = outcomes[Strategy.S2][0]
    assert [a.trust for a in case.attempts] == [Trust.REJECTED, Trust.CONTROLLED]
    assert case.attempts[0].latency_seconds == 40.0
    assert case.attempts[1].estimated_cost_usd == 0.03


def test_logged_attempt_without_composite_is_an_error() -> None:
    with pytest.raises(EvaluationError, match="no composite"):
        build_outcomes([_record(1)], {}, {}, None, {})


def test_malformed_rating_is_an_error(tmp_path: Path) -> None:
    ratings = tmp_path / "r.json"
    ratings.write_text(json.dumps({"abc": {"rubric": "yes"}}))
    with pytest.raises(EvaluationError, match="malformed"):
        rubrics_by_candidate({"abc": ("c01", Strategy.S2, 1)}, ratings)


def test_s1_candidates_enter_the_pack_as_composites(
    case_dir: Path, tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    edit = tmp_path / "edit.png"
    Image.new("RGB", (400, 300), (250, 250, 250)).save(edit)
    root = tmp_path / "root"
    main(["candidate", str(case_dir), "s1", str(edit), "--attempt", "1", "--out", str(root)])
    capsys.readouterr()
    main(
        [
            "pack",
            str(root),
            "--out",
            str(tmp_path / "pack"),
            "--key",
            str(tmp_path / "k.json"),
            "--seed",
            "1",
        ]
    )
    items = json.loads((tmp_path / "pack" / "items.json").read_text())
    assert list(items[0]["images"]) == ["original"]


def test_attempts_after_the_first_rated_controlled_one_are_ignored() -> None:
    # Extra attempts ran because a stricter screening missed the success (D-035 stops there).
    triples = {("c01", Strategy.S2, n) for n in (1, 2)}
    outcomes, _ = build_outcomes(
        [_record(1), _record(2)],
        dict.fromkeys(triples, True),
        dict.fromkeys(triples, RUBRIC),
        None,
        {},
    )
    (case,) = outcomes[Strategy.S2]
    assert len(case.attempts) == 1
    assert case.succeeded


def test_measured_cost_wins_over_the_flat_estimate() -> None:
    triple = ("c01", Strategy.S2, 1)
    record = _record(1).model_copy(update={"cost_usd": 0.023})
    outcomes, _ = build_outcomes(
        [record], {triple: True}, {triple: RUBRIC}, None, {Strategy.S2: 0.5}
    )
    assert outcomes[Strategy.S2][0].attempts[0].estimated_cost_usd == 0.023


def test_only_listed_cases_are_evaluated() -> None:
    other = _record(1).model_copy(update={"case_id": "c08"})
    triple = ("c01", Strategy.S2, 1)
    outcomes, _ = build_outcomes(
        [_record(1), other], {triple: True}, {triple: RUBRIC}, None, {}, cases={"c01"}
    )
    assert [c.case_id for c in outcomes[Strategy.S2]] == ["c01"]
