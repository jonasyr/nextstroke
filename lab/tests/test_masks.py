import numpy as np
import pytest

from nextstroke_lab.domain.masks import MaskError, RegionMasks


def _mask(rows: list[str]) -> np.ndarray:
    return np.array([[c == "#" for c in row] for row in rows], dtype=bool)


def test_writable_is_editable_minus_protected() -> None:
    masks = RegionMasks(
        editable=_mask(["###", "###"]),
        protected=_mask(["#..", "..."]),
        feather=_mask(["...", "..."]),
    )
    assert masks.writable.tolist() == _mask([".##", "###"]).tolist()


def test_protected_wins_where_it_intersects_editable() -> None:
    masks = RegionMasks(
        editable=_mask(["##"]),
        protected=_mask(["##"]),
        feather=_mask([".."]),
    )
    assert not masks.writable.any()


def test_feather_outside_editable_is_rejected() -> None:
    with pytest.raises(MaskError, match="feather"):
        RegionMasks(editable=_mask(["#."]), protected=_mask([".."]), feather=_mask([".#"]))


def test_shape_mismatch_is_rejected() -> None:
    with pytest.raises(MaskError, match="shape"):
        RegionMasks(editable=_mask(["##"]), protected=_mask(["#"]), feather=_mask([".."]))


def test_non_boolean_mask_is_rejected() -> None:
    with pytest.raises(MaskError, match="boolean"):
        RegionMasks(
            editable=np.ones((1, 2), dtype=np.uint8),
            protected=_mask([".."]),
            feather=_mask([".."]),
        )


def test_masks_must_be_two_dimensional() -> None:
    with pytest.raises(MaskError, match="2-D"):
        RegionMasks(
            editable=np.ones((1, 2, 1), dtype=bool),
            protected=np.zeros((1, 2, 1), dtype=bool),
            feather=np.zeros((1, 2, 1), dtype=bool),
        )
