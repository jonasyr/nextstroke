from pathlib import Path

import numpy as np
import pytest
from PIL import Image

from nextstroke_lab.cli import main


@pytest.mark.parametrize(
    ("name", "size", "expected"),
    [
        ("pin.webp", (736, 1300), (736, 1104)),
        ("photo.jpg", (4032, 3024), (2048, 1365)),
        ("square.png", (800, 800), (800, 533)),
    ],
)
def test_prepare_crops_scales_and_creates_blank_masks(
    tmp_path: Path, name: str, size: tuple[int, int], expected: tuple[int, int]
) -> None:
    source = tmp_path / name
    Image.new("RGB", size, (240, 240, 240)).save(source)
    case = tmp_path / "cases" / "c01"
    assert main(["prepare", str(source), "--case-dir", str(case)]) == 0
    with Image.open(case / "original.png") as original:
        assert original.size == expected
    for mask in ("editable.png", "protected.png"):
        with Image.open(case / mask) as image:
            assert image.size == expected
            assert not np.asarray(image).any()


def test_prepare_never_overwrites_painted_masks(tmp_path: Path) -> None:
    source = tmp_path / "pin.png"
    Image.new("RGB", (600, 400)).save(source)
    case = tmp_path / "c01"
    main(["prepare", str(source), "--case-dir", str(case)])
    Image.new("L", (600, 400), 255).save(case / "editable.png")
    main(["prepare", str(source), "--case-dir", str(case)])
    with Image.open(case / "editable.png") as image:
        assert np.asarray(image).all()
