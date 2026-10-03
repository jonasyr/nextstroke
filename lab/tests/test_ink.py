import numpy as np
import pytest

from nextstroke_lab.domain.ink import detect_ink, dilate


def _paper_with_line(shade: int = 235) -> np.ndarray:
    gray = np.full((60, 80), shade, dtype=np.uint8)
    gray[30, 10:70] = 20
    return gray


def test_detects_dark_line_on_light_paper() -> None:
    ink = detect_ink(_paper_with_line(), window=15, offset=25)
    assert ink[30, 10:70].all()
    assert not ink[:25].any()


def test_uneven_lighting_does_not_count_as_ink() -> None:
    gradient = np.tile(np.linspace(140, 250, 80).astype(np.uint8), (60, 1))
    gradient[30, 10:70] = gradient[30, 10:70] // 4
    ink = detect_ink(gradient, window=15, offset=25)
    assert ink[30, 20:60].all()
    assert ink.sum() < 80


def test_dilate_grows_by_radius_and_keeps_shape() -> None:
    mask = np.zeros((9, 9), dtype=bool)
    mask[4, 4] = True
    grown = dilate(mask, 2)
    assert grown.sum() == 25
    assert grown.shape == mask.shape
    assert dilate(mask, 0).sum() == 1


@pytest.mark.parametrize("bad", [0, 4])
def test_window_must_be_odd_and_positive(bad: int) -> None:
    with pytest.raises(ValueError, match="window"):
        detect_ink(_paper_with_line(), window=bad, offset=10)
