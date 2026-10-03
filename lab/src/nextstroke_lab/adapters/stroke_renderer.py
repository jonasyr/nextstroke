"""Deterministic rasterizer for S3 stroke plans.

The lab uses Pillow with 4x supersampling; the production web app will use
perfect-freehand (D-036). Output is an RGBA overlay of black ink.
"""

from __future__ import annotations

import numpy as np
from numpy.typing import NDArray
from PIL import Image, ImageDraw

from nextstroke_lab.domain.strokes import StrokePlan

SUPERSAMPLE = 4


def render_plan(plan: StrokePlan, width: int, height: int) -> NDArray[np.uint8]:
    big_w, big_h = width * SUPERSAMPLE, height * SUPERSAMPLE
    longest = max(big_w, big_h)
    alpha = Image.new("L", (big_w, big_h), 0)
    for stroke in plan.ordered():
        ink = Image.new("L", (big_w, big_h), 0)
        draw = ImageDraw.Draw(ink)
        line_px = max(1, round(stroke.width * longest))
        points = [(x * (big_w - 1), y * (big_h - 1)) for x, y in stroke.points]
        draw.line(points, fill=255, width=line_px, joint="curve")
        radius = line_px / 2
        for x, y in (points[0], points[-1]):
            draw.ellipse((x - radius, y - radius, x + radius, y + radius), fill=255)
        level = round(255 * stroke.darkness)
        ink_alpha = np.asarray(ink, dtype=np.uint16) * level // 255
        combined = np.maximum(np.asarray(alpha, dtype=np.uint16), ink_alpha)
        alpha = Image.fromarray(combined.astype(np.uint8))
    small = np.asarray(alpha.resize((width, height), Image.Resampling.BOX), dtype=np.uint8)
    layer = np.zeros((height, width, 4), dtype=np.uint8)
    layer[..., 3] = small
    return layer
