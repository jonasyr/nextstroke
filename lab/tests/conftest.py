from pathlib import Path

import numpy as np
import pytest
from PIL import Image


@pytest.fixture
def case_dir(tmp_path: Path) -> Path:
    """A synthetic case: grey paper, one black line, editable right half, protected strip."""
    case = tmp_path / "cases" / "c01"
    case.mkdir(parents=True)
    paper = np.full((300, 400, 3), 235, dtype=np.uint8)
    paper[150, 20:380] = 0
    Image.fromarray(paper).save(case / "original.png")
    editable = np.zeros((300, 400), dtype=np.uint8)
    editable[:, 200:] = 255
    Image.fromarray(editable).save(case / "editable.png")
    protected = np.zeros((300, 400), dtype=np.uint8)
    protected[145:156, :] = 255
    Image.fromarray(protected).save(case / "protected.png")
    return case
