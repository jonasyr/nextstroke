"""Parallel hatching inside a polygon (S3 fills, D-049).

Pure geometry in pixel space: the caller converts normalized coordinates so that
angle and spacing mean the same thing on landscape and portrait images.
"""

from __future__ import annotations

import math
from collections.abc import Sequence

Point = tuple[float, float]
Segment = tuple[Point, Point]


def _rotate(point: Point, cos: float, sin: float) -> Point:
    x, y = point
    return x * cos - y * sin, x * sin + y * cos


def hatch_segments(polygon: Sequence[Point], angle_deg: float, spacing: float) -> list[Segment]:
    """Segments of lines at `angle_deg` (0 = horizontal, 90 = vertical), `spacing` apart.

    Lines are centered in the polygon's extent; even-odd filling splits lines at concave notches.
    """
    if spacing <= 0:
        raise ValueError("spacing must be positive")
    if len(polygon) < 3:
        return []
    angle = math.radians(angle_deg)
    cos, sin = math.cos(-angle), math.sin(-angle)
    flat = [_rotate(p, cos, sin) for p in polygon]  # hatch lines become horizontal
    ys = [y for _, y in flat]
    low, high = min(ys), max(ys)
    count = max(0, math.floor((high - low) / spacing))
    first = low + ((high - low) - (count - 1) * spacing) / 2 if count else (low + high) / 2
    edges = list(zip(flat, flat[1:] + flat[:1], strict=True))
    back_cos, back_sin = math.cos(angle), math.sin(angle)
    segments: list[Segment] = []
    for i in range(max(count, 1) if high > low else 0):
        y = first + i * spacing
        xs = sorted(
            x0 + (y - y0) * (x1 - x0) / (y1 - y0)
            for (x0, y0), (x1, y1) in edges
            if (y0 <= y < y1) or (y1 <= y < y0)
        )
        for left, right in zip(xs[::2], xs[1::2], strict=False):
            if right - left > 1e-9:
                segments.append(
                    (
                        _rotate((left, y), back_cos, back_sin),
                        _rotate((right, y), back_cos, back_sin),
                    )
                )
    return segments
