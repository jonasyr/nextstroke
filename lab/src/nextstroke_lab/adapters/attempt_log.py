"""Append-only attempt log (Phase 0: record every attempt, never rewrite)."""

from __future__ import annotations

from datetime import datetime
from pathlib import Path
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

from nextstroke_lab.domain.classification import Strategy
from nextstroke_lab.domain.decision import MAX_ATTEMPTS


class AttemptLogError(ValueError):
    pass


class AttemptRecord(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    case_id: Annotated[str, Field(min_length=1)]
    strategy: Strategy
    attempt: Annotated[int, Field(ge=1, le=MAX_ATTEMPTS)]
    service: Literal["chatgpt", "claude", "local"]
    model_label: Annotated[str, Field(min_length=1)]
    prompt_revision: Annotated[str, Field(min_length=1)]
    started_at: datetime
    latency_seconds: Annotated[float, Field(ge=0.0)]
    output_path: str | None = None
    output_sha256: Annotated[str, Field(pattern=r"^[0-9a-f]{64}$")] | None = None
    failure: str | None = None
    notes: str = ""

    @model_validator(mode="after")
    def _output_or_failure(self) -> AttemptRecord:
        if (self.output_path is None) == (self.failure is None):
            raise ValueError("record either an output path or a failure reason")
        return self

    @property
    def key(self) -> tuple[str, Strategy, int]:
        return self.case_id, self.strategy, self.attempt


class AttemptLog:
    def __init__(self, path: Path) -> None:
        self._path = path

    def read(self) -> list[AttemptRecord]:
        if not self._path.exists():
            return []
        lines = self._path.read_text(encoding="utf-8").splitlines()
        return [AttemptRecord.model_validate_json(line) for line in lines if line.strip()]

    def append(self, record: AttemptRecord) -> None:
        keys = {r.key for r in self.read()}
        if record.key in keys:
            raise AttemptLogError(f"{record.key} is already logged")
        if record.attempt > 1 and (record.case_id, record.strategy, record.attempt - 1) not in keys:
            raise AttemptLogError(
                f"log attempt {record.attempt - 1} before attempt {record.attempt}"
            )
        self._path.parent.mkdir(parents=True, exist_ok=True)
        with self._path.open("a", encoding="utf-8") as handle:
            handle.write(record.model_dump_json() + "\n")
