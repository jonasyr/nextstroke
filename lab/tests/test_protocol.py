import json
from pathlib import Path

import pytest

from nextstroke_lab.domain.strokes import StrokePlan
from nextstroke_lab.schema import main

SCHEMA = Path(__file__).resolve().parent.parent / "protocol" / "stroke-plan.schema.json"


def test_published_stroke_schema_matches_code() -> None:
    expected = StrokePlan.model_json_schema()
    assert json.loads(SCHEMA.read_text(encoding="utf-8")) == expected, (
        "regenerate with: uv run python -m nextstroke_lab.schema > protocol/stroke-plan.schema.json"
    )


def test_schema_command_prints_the_schema(capsys: pytest.CaptureFixture[str]) -> None:
    main()
    assert json.loads(capsys.readouterr().out) == StrokePlan.model_json_schema()
