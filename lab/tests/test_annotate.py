import json
from pathlib import Path

import numpy as np
import pytest
from PIL import Image

from nextstroke_lab.cli import main

EDITABLE = json.dumps([[[0.5, 0.0], [1.0, 0.0], [1.0, 1.0], [0.5, 1.0]]])


def _case(tmp_path: Path) -> Path:
    case = tmp_path / "cases" / "c07"
    case.mkdir(parents=True)
    paper = np.full((200, 300, 3), 235, dtype=np.uint8)
    paper[100, 20:280] = 15  # a line crossing both halves
    Image.fromarray(paper).save(case / "original.png")
    return case


def _mask(path: Path) -> np.ndarray:
    with Image.open(path) as image:
        return np.asarray(image) > 127


def test_annotate_writes_masks_and_metadata(tmp_path: Path) -> None:
    case = _case(tmp_path)
    code = main(
        [
            "annotate",
            str(case),
            "--editable",
            EDITABLE,
            "--change",
            "Schraffur unter der Linie",
            "--protect-note",
            "Horizontlinie",
        ]
    )
    assert code == 0
    editable, protected = _mask(case / "editable.png"), _mask(case / "protected.png")
    assert editable[:, 160:].all()
    assert not editable[:, :140].any()
    assert protected[100, 200], "existing ink inside the editable region is protected"
    assert not protected[100, 40], "ink far outside the editable region needs no protection"
    assert not protected[50, 200], "blank paper stays writable"
    meta = json.loads((case / "annotation.json").read_text())
    assert meta["case_id"] == "c07"
    assert meta["annotator"] == "claude-draft"
    assert meta["owner_reviewed"] is False
    assert meta["critical_contour_in_editable"] is True
    assert 0.9 < meta["writable_fraction_of_editable"] < 1.0


def test_extra_protected_polygon_is_added(tmp_path: Path) -> None:
    case = _case(tmp_path)
    extra = json.dumps([[[0.8, 0.1], [0.9, 0.1], [0.9, 0.2], [0.8, 0.2]]])
    main(
        [
            "annotate",
            str(case),
            "--editable",
            EDITABLE,
            "--change",
            "x",
            "--protect-note",
            "y",
            "--extra-protected",
            extra,
        ]
    )
    assert _mask(case / "protected.png")[30, 255]


def test_invalid_polygon_json_is_a_clean_error(tmp_path: Path) -> None:
    case = _case(tmp_path)
    with pytest.raises(SystemExit) as info:
        main(
            [
                "annotate",
                str(case),
                "--editable",
                "[[1, 2]]",
                "--change",
                "x",
                "--protect-note",
                "y",
            ]
        )
    assert info.value.code == 2


def test_review_sheet_renders_every_case(tmp_path: Path) -> None:
    for name in ("c01", "c02", "c03"):
        case = tmp_path / "cases" / name
        case.mkdir(parents=True)
        Image.new("RGB", (300, 200), (235, 235, 235)).save(case / "original.png")
        main(
            [
                "annotate",
                str(case),
                "--editable",
                EDITABLE,
                "--change",
                "Punkte",
                "--protect-note",
                "-",
            ]
        )
    sheet = tmp_path / "sheet.png"
    assert main(["sheet", str(tmp_path / "cases"), "--out", str(sheet)]) == 0
    with Image.open(sheet) as image:
        assert image.width >= 2 * 480
        pixels = np.asarray(image.convert("RGB"))
    assert (pixels[..., 1] > pixels[..., 0] + 30).any(), "editable area is tinted green"
