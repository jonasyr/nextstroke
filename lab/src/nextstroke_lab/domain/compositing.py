"""Local compositing and the boundary audit (spec §8, AGENTS rule 5).

Pixels outside the editable region and inside protected geometry always come
from the working image. The audit proves this bit-exactly; it says nothing
about artistic meaning.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
from numpy.typing import NDArray

from nextstroke_lab.domain.masks import RegionMasks

Image = NDArray[np.uint8]


class CompositingError(ValueError):
    """Raised for inputs the compositor cannot process safely."""


@dataclass(frozen=True)
class AuditResult:
    passed: bool
    violating_pixels: int


def _require(image: Image, masks: RegionMasks, channels: int, name: str) -> None:
    if image.dtype != np.uint8:
        raise CompositingError(f"{name} must be uint8")
    if image.shape != (*masks.shape, channels):
        raise CompositingError(f"{name} shape {image.shape} does not match masks {masks.shape}")


def composite_overlay(working: Image, overlay_rgba: Image, masks: RegionMasks) -> Image:
    """Alpha-composite an RGBA overlay; alpha is forced to zero where not writable."""
    _require(working, masks, 3, "working image")
    _require(overlay_rgba, masks, 4, "overlay")
    alpha = (overlay_rgba[..., 3:4].astype(np.float64) / 255.0) * masks.writable[..., None]
    blended = working * (1.0 - alpha) + overlay_rgba[..., :3] * alpha
    result = np.rint(blended).astype(np.uint8)
    return np.where(masks.writable[..., None], result, working)


def copy_back(working: Image, candidate: Image, masks: RegionMasks) -> Image:
    """Keep a registered full-image candidate only where writable.

    The feather band (inside the editable region) is blended halfway; this is a
    Phase 0 simplification of a distance-based feather.
    """
    _require(working, masks, 3, "working image")
    _require(candidate, masks, 3, "candidate")
    half = np.rint((working.astype(np.uint16) + candidate) / 2).astype(np.uint8)
    inner = masks.writable & ~masks.feather
    feathered = masks.writable & masks.feather
    out = np.where(inner[..., None], candidate, working)
    return np.where(feathered[..., None], half, out)


def boundary_audit(working: Image, composite: Image, masks: RegionMasks) -> AuditResult:
    """Count pixels that differ from the working image where nothing may change."""
    _require(working, masks, 3, "working image")
    _require(composite, masks, 3, "composite")
    changed = (working != composite).any(axis=2) & ~masks.writable
    count = int(changed.sum())
    return AuditResult(passed=count == 0, violating_pixels=count)
