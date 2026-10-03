"""Pure geometry helpers."""

from __future__ import annotations

RATIO = 1.5  # 3:2, matching ChatGPT image outputs (1536x1024 / 1024x1536)


def crop_box_3_2(width: int, height: int) -> tuple[int, int, int, int]:
    """Largest centered 3:2 box (landscape if width >= height, else portrait)."""
    if width <= 0 or height <= 0:
        raise ValueError("image size must be positive")
    if width >= height:
        if width / height > RATIO:
            new_w, new_h = round(height * RATIO), height
        else:
            new_w, new_h = width, round(width / RATIO)
    elif height / width > RATIO:
        new_w, new_h = width, round(width * RATIO)
    else:
        new_w, new_h = round(height / RATIO), height
    left, top = (width - new_w) // 2, (height - new_h) // 2
    return left, top, left + new_w, top + new_h
