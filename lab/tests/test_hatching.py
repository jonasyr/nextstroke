import math

import pytest

from nextstroke_lab.adapters.stroke_renderer import render_plan
from nextstroke_lab.domain.hatching import hatch_segments
from nextstroke_lab.domain.strokes import StrokePlan

SQUARE = [(0.0, 0.0), (100.0, 0.0), (100.0, 100.0), (0.0, 100.0)]


def test_horizontal_hatching_fills_a_square_with_evenly_spaced_lines() -> None:
    segments = hatch_segments(SQUARE, angle_deg=0.0, spacing=10.0)
    assert len(segments) == 10
    ys = sorted(round(a[1], 6) for a, _ in segments)
    assert ys == [5.0 + 10 * i for i in range(10)]
    for (x0, _), (x1, _) in segments:
        assert sorted((x0, x1)) == pytest.approx([0.0, 100.0])


def test_vertical_hatching_runs_top_to_bottom() -> None:
    segments = hatch_segments(SQUARE, angle_deg=90.0, spacing=25.0)
    assert len(segments) == 4
    for (x0, y0), (x1, y1) in segments:
        assert x0 == pytest.approx(x1)
        assert sorted((y0, y1)) == pytest.approx([0.0, 100.0])


def test_diagonal_lines_stay_inside_the_polygon() -> None:
    for a, b in hatch_segments(SQUARE, angle_deg=45.0, spacing=7.0):
        for x, y in (a, b):
            assert -1e-6 <= x <= 100 + 1e-6
            assert -1e-6 <= y <= 100 + 1e-6
        assert math.isclose(abs(b[1] - a[1]), abs(b[0] - a[0]), abs_tol=1e-6)


def test_concave_shapes_split_lines_at_the_notch() -> None:
    u_shape = [(0, 0), (30, 0), (30, 60), (70, 60), (70, 0), (100, 0), (100, 100), (0, 100)]
    segments = hatch_segments([(float(x), float(y)) for x, y in u_shape], 0.0, 20.0)
    top = [s for s in segments if s[0][1] < 60]
    assert len(top) == 2 * len({round(s[0][1], 6) for s in top})


def test_degenerate_input_yields_nothing() -> None:
    assert hatch_segments([(0.0, 0.0), (1.0, 1.0)], 0.0, 1.0) == []
    with pytest.raises(ValueError, match="spacing"):
        hatch_segments(SQUARE, 0.0, 0.0)


def _plan(
    fills: list[dict[str, object]], strokes: list[dict[str, object]] | None = None
) -> StrokePlan:
    return StrokePlan.model_validate(
        {"schema_version": "2", "case_id": "c01", "strokes": strokes or [], "fills": fills}
    )


FILL = {
    "order": 1,
    "polygon": [[0.25, 0.25], [0.75, 0.25], [0.75, 0.75], [0.25, 0.75]],
    "angle_deg": 45,
    "spacing": 0.02,
    "width": 0.002,
    "darkness": 1.0,
}


def test_a_fill_alone_is_a_valid_plan_and_renders_inside_its_polygon() -> None:
    layer = render_plan(_plan([FILL]), width=200, height=200)
    alpha = layer[..., 3]
    assert alpha[50:150, 50:150].any()
    outside = alpha.copy()
    outside[45:155, 45:155] = 0
    assert not outside.any()


def test_cross_hatching_adds_ink() -> None:
    single = render_plan(_plan([FILL]), 200, 200)[..., 3].astype(int).sum()
    cross = render_plan(_plan([{**FILL, "cross": True}]), 200, 200)[..., 3].astype(int).sum()
    assert cross > single * 1.5


def test_a_plan_needs_strokes_or_fills() -> None:
    with pytest.raises(ValueError, match="strokes or fills"):
        _plan([])


def test_version_one_plans_cannot_use_fills() -> None:
    with pytest.raises(ValueError, match="version 2"):
        StrokePlan.model_validate(
            {"schema_version": "1", "case_id": "c01", "strokes": [], "fills": [FILL]}
        )


def test_order_is_unique_across_strokes_and_fills() -> None:
    stroke = {"order": 1, "points": [[0.1, 0.1], [0.2, 0.2]], "width": 0.002, "darkness": 1}
    with pytest.raises(ValueError, match="unique"):
        _plan([FILL], [stroke])


def test_fill_spacing_has_fineliner_bounds() -> None:
    with pytest.raises(ValueError, match="spacing"):
        _plan([{**FILL, "spacing": 0.0001}])
