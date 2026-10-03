import numpy as np
import pytest
from hypothesis import given, settings
from hypothesis import strategies as st
from hypothesis.extra.numpy import arrays

from nextstroke_lab.domain.compositing import (
    CompositingError,
    boundary_audit,
    composite_overlay,
    copy_back,
)
from nextstroke_lab.domain.masks import RegionMasks

H, W = 4, 5


def _masks(editable: np.ndarray, protected: np.ndarray | None = None) -> RegionMasks:
    zeros = np.zeros_like(editable)
    return RegionMasks(
        editable=editable,
        protected=zeros if protected is None else protected,
        feather=zeros,
    )


def _working() -> np.ndarray:
    return np.arange(H * W * 3, dtype=np.uint8).reshape(H, W, 3)


def test_opaque_overlay_inside_writable_replaces_pixels() -> None:
    editable = np.zeros((H, W), dtype=bool)
    editable[1, 1] = True
    overlay = np.zeros((H, W, 4), dtype=np.uint8)
    overlay[..., 3] = 255  # opaque black everywhere, including forbidden areas
    out = composite_overlay(_working(), overlay, _masks(editable))
    assert out[1, 1].tolist() == [0, 0, 0]
    assert boundary_audit(_working(), out, _masks(editable)).passed


def test_overlay_alpha_is_ignored_inside_protected_geometry() -> None:
    editable = np.ones((H, W), dtype=bool)
    protected = np.zeros((H, W), dtype=bool)
    protected[0, :] = True
    overlay = np.full((H, W, 4), 255, dtype=np.uint8)
    out = composite_overlay(_working(), overlay, _masks(editable, protected))
    assert np.array_equal(out[0], _working()[0])


def test_half_transparent_overlay_blends() -> None:
    editable = np.ones((H, W), dtype=bool)
    working = np.full((H, W, 3), 200, dtype=np.uint8)
    overlay = np.zeros((H, W, 4), dtype=np.uint8)
    overlay[..., 3] = 128
    out = composite_overlay(working, overlay, _masks(editable))
    assert int(out[0, 0, 0]) == round(200 * (1 - 128 / 255))


def test_copy_back_keeps_candidate_only_where_writable() -> None:
    editable = np.zeros((H, W), dtype=bool)
    editable[2:, 2:] = True
    candidate = np.zeros((H, W, 3), dtype=np.uint8)
    out = copy_back(_working(), candidate, _masks(editable))
    assert np.array_equal(out[~editable], _working()[~editable])
    assert not out[editable].any()


def test_copy_back_blends_feather_band_halfway() -> None:
    editable = np.ones((1, 2), dtype=bool)
    feather = np.array([[True, False]])
    masks = RegionMasks(editable=editable, protected=np.zeros_like(editable), feather=feather)
    working = np.full((1, 2, 3), 100, dtype=np.uint8)
    candidate = np.full((1, 2, 3), 200, dtype=np.uint8)
    out = copy_back(working, candidate, masks)
    assert out[0, 0].tolist() == [150, 150, 150]
    assert out[0, 1].tolist() == [200, 200, 200]


def test_audit_counts_changed_forbidden_pixels() -> None:
    editable = np.zeros((H, W), dtype=bool)
    tampered = _working().copy()
    tampered[0, 0] = [255, 255, 255]
    tampered[3, 4] = [1, 2, 3]
    result = boundary_audit(_working(), tampered, _masks(editable))
    assert not result.passed
    assert result.violating_pixels == 2


def test_shape_mismatch_raises() -> None:
    editable = np.ones((H, W), dtype=bool)
    with pytest.raises(CompositingError, match="shape"):
        composite_overlay(_working(), np.zeros((H, W, 3), dtype=np.uint8), _masks(editable))
    with pytest.raises(CompositingError, match="shape"):
        copy_back(_working(), np.zeros((H, W + 1, 3), dtype=np.uint8), _masks(editable))
    with pytest.raises(CompositingError, match="shape"):
        boundary_audit(_working(), np.zeros((1, 1, 3), dtype=np.uint8), _masks(editable))


def test_non_uint8_input_raises() -> None:
    editable = np.ones((H, W), dtype=bool)
    with pytest.raises(CompositingError, match="uint8"):
        composite_overlay(
            _working().astype(np.float32), np.zeros((H, W, 4), dtype=np.uint8), _masks(editable)
        )


@settings(max_examples=50, deadline=None)
@given(
    working=arrays(np.uint8, (H, W, 3)),
    overlay=arrays(np.uint8, (H, W, 4)),
    editable=arrays(np.bool_, (H, W)),
    protected=arrays(np.bool_, (H, W)),
)
def test_composite_never_changes_forbidden_pixels(
    working: np.ndarray, overlay: np.ndarray, editable: np.ndarray, protected: np.ndarray
) -> None:
    masks = _masks(editable, protected)
    assert boundary_audit(working, composite_overlay(working, overlay, masks), masks).passed


@settings(max_examples=50, deadline=None)
@given(
    working=arrays(np.uint8, (H, W, 3)),
    candidate=arrays(np.uint8, (H, W, 3)),
    editable=arrays(np.bool_, (H, W)),
    protected=arrays(np.bool_, (H, W)),
    seed=st.integers(0, 2**16),
)
def test_copy_back_never_changes_forbidden_pixels(
    working: np.ndarray,
    candidate: np.ndarray,
    editable: np.ndarray,
    protected: np.ndarray,
    seed: int,
) -> None:
    feather = editable & (np.random.default_rng(seed).random((H, W)) > 0.5)
    masks = RegionMasks(editable=editable, protected=protected, feather=feather)
    assert boundary_audit(working, copy_back(working, candidate, masks), masks).passed
