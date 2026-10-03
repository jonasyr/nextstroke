import json

import pytest
from pydantic import ValidationError

from nextstroke_lab.domain.strokes import StrokePlan

VALID = {
    "schema_version": "1",
    "case_id": "c01",
    "strokes": [
        {"order": 1, "points": [[0.1, 0.1], [0.2, 0.2]], "width": 0.002, "darkness": 0.9},
        {
            "order": 2,
            "points": [[0.3, 0.3], [0.4, 0.3], [0.5, 0.35]],
            "width": 0.001,
            "darkness": 1,
        },
    ],
}


def test_valid_plan_parses_from_json() -> None:
    plan = StrokePlan.model_validate_json(json.dumps(VALID))
    assert [s.order for s in plan.strokes] == [1, 2]


def test_strokes_are_returned_in_drawing_order() -> None:
    data = {**VALID, "strokes": list(reversed(VALID["strokes"]))}
    plan = StrokePlan.model_validate(data)
    assert [s.order for s in plan.ordered()] == [1, 2]


@pytest.mark.parametrize(
    "stroke",
    [
        {"order": 1, "points": [[0.1, 0.1]], "width": 0.002, "darkness": 1},
        {"order": 1, "points": [[1.2, 0.1], [0.2, 0.2]], "width": 0.002, "darkness": 1},
        {"order": 1, "points": [[0.1, 0.1], [0.2, 0.2]], "width": 0.05, "darkness": 1},
        {"order": 1, "points": [[0.1, 0.1], [0.2, 0.2]], "width": 0.002, "darkness": 1.5},
        {
            "order": 1,
            "points": [[0.1, 0.1], [0.2, 0.2]],
            "width": 0.002,
            "darkness": 1,
            "color": "white",
        },
    ],
)
def test_invalid_stroke_is_rejected(stroke: dict[str, object]) -> None:
    with pytest.raises(ValidationError):
        StrokePlan.model_validate({**VALID, "strokes": [stroke]})


def test_duplicate_order_is_rejected() -> None:
    strokes = [VALID["strokes"][0], VALID["strokes"][0]]
    with pytest.raises(ValidationError, match="order"):
        StrokePlan.model_validate({**VALID, "strokes": strokes})


def test_empty_plan_and_unknown_version_are_rejected() -> None:
    with pytest.raises(ValidationError):
        StrokePlan.model_validate({**VALID, "strokes": []})
    with pytest.raises(ValidationError):
        StrokePlan.model_validate({**VALID, "schema_version": "3"})
