import numpy as np

from nextstroke_lab.adapters.stroke_renderer import render_plan
from nextstroke_lab.domain.strokes import StrokePlan


def _plan(darkness: float = 1.0) -> StrokePlan:
    return StrokePlan.model_validate(
        {
            "schema_version": "1",
            "case_id": "c01",
            "strokes": [
                {
                    "order": 1,
                    "points": [[0.1, 0.5], [0.9, 0.5]],
                    "width": 0.01,
                    "darkness": darkness,
                }
            ],
        }
    )


def test_renders_black_rgba_line_only_where_drawn() -> None:
    layer = render_plan(_plan(), width=200, height=100)
    assert layer.shape == (100, 200, 4)
    assert layer.dtype == np.uint8
    assert not layer[..., :3].any(), "fineliner overlay is black ink only"
    assert layer[50, 100, 3] == 255
    assert layer[10, 100, 3] == 0
    assert layer[50, 5, 3] == 0


def test_darkness_scales_alpha() -> None:
    layer = render_plan(_plan(darkness=0.5), width=200, height=100)
    assert 120 <= layer[50, 100, 3] <= 135


def test_rendering_is_deterministic() -> None:
    a = render_plan(_plan(), width=321, height=123)
    b = render_plan(_plan(), width=321, height=123)
    assert np.array_equal(a, b)


def test_stroke_width_is_relative_to_longest_edge() -> None:
    layer = render_plan(_plan(), width=400, height=200)
    column = layer[:, 200, 3]
    drawn = int((column > 127).sum())
    assert 3 <= drawn <= 5  # 0.01 * 400 px
