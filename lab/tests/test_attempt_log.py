from datetime import UTC, datetime
from pathlib import Path

import pytest

from nextstroke_lab.adapters.attempt_log import AttemptLog, AttemptLogError, AttemptRecord
from nextstroke_lab.domain.classification import Strategy


def _record(
    attempt: int = 1, strategy: Strategy = Strategy.S3, case_id: str = "c01"
) -> AttemptRecord:
    return AttemptRecord(
        case_id=case_id,
        strategy=strategy,
        attempt=attempt,
        service="claude",
        model_label="Claude (app label as shown)",
        prompt_revision="s3-v1",
        started_at=datetime(2026, 10, 5, 9, 0, tzinfo=UTC),
        latency_seconds=12.5,
        output_path="outputs/c01-s3-1.json",
        output_sha256="0" * 64,
    )


def test_records_are_appended_and_read_back(tmp_path: Path) -> None:
    log = AttemptLog(tmp_path / "attempts.jsonl")
    log.append(_record(1))
    log.append(_record(2))
    assert [r.attempt for r in log.read()] == [1, 2]


def test_existing_lines_are_never_rewritten(tmp_path: Path) -> None:
    path = tmp_path / "attempts.jsonl"
    log = AttemptLog(path)
    log.append(_record(1))
    first = path.read_text()
    log.append(_record(2))
    assert path.read_text().startswith(first)


def test_duplicate_attempt_is_rejected(tmp_path: Path) -> None:
    log = AttemptLog(tmp_path / "attempts.jsonl")
    log.append(_record(1))
    with pytest.raises(AttemptLogError, match="already logged"):
        log.append(_record(1))


def test_attempts_must_be_consecutive(tmp_path: Path) -> None:
    log = AttemptLog(tmp_path / "attempts.jsonl")
    with pytest.raises(AttemptLogError, match="attempt 1"):
        log.append(_record(2))


def test_cases_and_strategies_are_independent(tmp_path: Path) -> None:
    log = AttemptLog(tmp_path / "attempts.jsonl")
    log.append(_record(1, Strategy.S2))
    log.append(_record(1, Strategy.S3))
    log.append(_record(1, Strategy.S3, case_id="c02"))
    assert len(log.read()) == 3


def test_missing_log_reads_empty(tmp_path: Path) -> None:
    assert AttemptLog(tmp_path / "none.jsonl").read() == []


def test_failed_attempt_needs_reason_instead_of_output() -> None:
    with pytest.raises(ValueError, match="failure"):
        AttemptRecord.model_validate(
            {**_record().model_dump(), "output_path": None, "output_sha256": None}
        )
    failed = AttemptRecord.model_validate(
        {**_record().model_dump(), "output_path": None, "output_sha256": None, "failure": "refused"}
    )
    assert failed.failure == "refused"


def test_more_than_three_attempts_is_invalid() -> None:
    with pytest.raises(ValueError, match="less than or equal"):
        AttemptRecord.model_validate({**_record().model_dump(), "attempt": 4})


def test_api_attempts_carry_measured_cost_and_usage(tmp_path: Path) -> None:
    record = _record().model_copy(
        update={"service": "openai", "cost_usd": 0.05, "usage": {"image_output": 1000}}
    )
    log = AttemptLog(tmp_path / "attempts.jsonl")
    log.append(AttemptRecord.model_validate(record.model_dump()))
    (back,) = log.read()
    assert back.cost_usd == 0.05
    assert back.usage == {"image_output": 1000}


def test_negative_costs_are_rejected() -> None:
    with pytest.raises(ValueError, match="greater than or equal"):
        AttemptRecord.model_validate({**_record().model_dump(), "cost_usd": -1})
