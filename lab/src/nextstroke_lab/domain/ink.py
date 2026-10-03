"""Ink detection for drafting protected geometry.

A fineliner cannot erase, so existing ink inside the editable region is
protected by default. Detection compares each pixel with its local mean
(adaptive threshold), which tolerates uneven photo lighting.
"""

from __future__ import annotations

import numpy as np
from numpy.typing import NDArray


def _box_mean(gray: NDArray[np.float64], window: int) -> NDArray[np.float64]:
    pad = window // 2
    padded = np.pad(gray, pad, mode="edge")
    integral = np.pad(padded.cumsum(0).cumsum(1), ((1, 0), (1, 0)))
    total = (
        integral[window:, window:]
        - integral[:-window, window:]
        - integral[window:, :-window]
        + integral[:-window, :-window]
    )
    mean: NDArray[np.float64] = total / (window * window)
    return mean


def detect_ink(gray: NDArray[np.uint8], window: int = 31, offset: int = 25) -> NDArray[np.bool_]:
    """Pixels darker than their local mean by more than ``offset`` grey levels."""
    if window < 1 or window % 2 == 0:
        raise ValueError("window must be a positive odd number")
    values = gray.astype(np.float64)
    return values < _box_mean(values, window) - offset


def dilate(mask: NDArray[np.bool_], radius: int) -> NDArray[np.bool_]:
    """Square dilation by ``radius`` pixels."""
    if radius <= 0:
        return mask.copy()
    padded = np.pad(mask, radius)
    out = np.zeros_like(mask)
    height, width = mask.shape
    size = 2 * radius + 1
    for dy in range(size):
        for dx in range(size):
            out |= padded[dy : dy + height, dx : dx + width]
    return out
