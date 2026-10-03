import json
from pathlib import Path

import numpy as np
import pytest
from PIL import Image

from nextstroke_lab.adapters.image_io import RegistrationError
from nextstroke_lab.domain.classification import Strategy
from nextstroke_lab.pipeline import BACKGROUNDS, build_candidate, load_case

PLAN = {
    "schema_version": "1",
    "case_id": "c01",
    "strokes": [{"order": 1, "points": [[0.1, 0.2], [0.9, 0.8]], "width": 0.005, "darkness": 1}],
}


def test_load_case_reads_masks_and_defaults_empty_feather(case_dir: Path) -> None:
    case = load_case(case_dir)
    assert case.case_id == "c01"
    assert case.working.pixels.shape == (300, 400, 3)
    assert case.masks.editable[:, 200:].all()
    assert not case.masks.feather.any()


def test_s3_candidate_is_composited_and_audited(case_dir: Path, tmp_path: Path) -> None:
    plan_path = tmp_path / "plan.json"
    plan_path.write_text(json.dumps(PLAN))
    result = build_candidate(load_case(case_dir), Strategy.S3, plan_path, tmp_path / "out")
    assert result.audit.passed
    composite = np.asarray(Image.open(result.composite_path))
    original = np.asarray(Image.open(case_dir / "original.png"))
    assert np.array_equal(composite[:, :200], original[:, :200]), "left half is not editable"
    assert np.array_equal(composite[145:156], original[145:156]), "protected strip unchanged"
    assert set(result.background_paths) == set(BACKGROUNDS)
    assert all(p.exists() for p in result.background_paths.values())


def test_s2_overlay_with_wrong_aspect_is_not_registered(case_dir: Path, tmp_path: Path) -> None:
    overlay = tmp_path / "overlay.png"
    Image.new("RGBA", (500, 500), (0, 0, 0, 255)).save(overlay)
    with pytest.raises(RegistrationError):
        build_candidate(load_case(case_dir), Strategy.S2, overlay, tmp_path / "out")


def test_s2_overlay_is_fitted_and_limited_to_writable(case_dir: Path, tmp_path: Path) -> None:
    overlay = tmp_path / "overlay.png"
    Image.new("RGBA", (800, 600), (0, 0, 0, 255)).save(overlay)
    result = build_candidate(load_case(case_dir), Strategy.S2, overlay, tmp_path / "out")
    assert result.audit.passed


def test_s1_full_composite_is_copied_back(case_dir: Path, tmp_path: Path) -> None:
    candidate = tmp_path / "s1.png"
    Image.new("RGB", (400, 300), (255, 0, 0)).save(candidate)
    result = build_candidate(load_case(case_dir), Strategy.S1, candidate, tmp_path / "out")
    assert result.audit.passed
    composite = np.asarray(Image.open(result.composite_path))
    assert composite[10, 300].tolist() == [255, 0, 0]
    assert composite[10, 10].tolist() == [235, 235, 235]


def test_case_ids_in_plan_must_match(case_dir: Path, tmp_path: Path) -> None:
    plan_path = tmp_path / "plan.json"
    plan_path.write_text(json.dumps({**PLAN, "case_id": "c99"}))
    with pytest.raises(ValueError, match="c99"):
        build_candidate(load_case(case_dir), Strategy.S3, plan_path, tmp_path / "out")


def test_optional_feather_mask_is_loaded(case_dir: Path) -> None:
    feather = np.zeros((300, 400), dtype=np.uint8)
    feather[:, 200:205] = 255
    Image.fromarray(feather).save(case_dir / "feather.png")
    assert load_case(case_dir).masks.feather[:, 200:205].all()
