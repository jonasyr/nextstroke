import json
from pathlib import Path

from PIL import Image

from nextstroke_lab.adapters.case_prompts import s1_prompt_v2, s2_prompt_v2
from nextstroke_lab.cli import main


def _case(root: Path, name: str, size: tuple[int, int], change: str) -> None:
    case = root / name
    case.mkdir(parents=True)
    Image.new("RGB", size).save(case / "original.png")
    (case / "annotation.json").write_text(
        json.dumps(
            {"desired_change": change, "protected_description": "Linien", "owner_reviewed": True}
        )
    )


def test_prompts_are_filled_per_case(tmp_path: Path) -> None:
    root = tmp_path / "cases"
    _case(root, "c01", (600, 400), "Zwei Möwen")
    _case(root, "c02", (400, 600), "Wasserkreise")
    (root / "c03").mkdir()  # not annotated: skipped
    out = tmp_path / "prompts.md"
    assert main(["prompts", str(root), "--out", str(out)]) == 0
    text = out.read_text(encoding="utf-8")
    assert "## c01" in text
    assert "## c03" not in text
    assert "Striche für: Zwei Möwen" in text
    assert "Querformat, 3:2" in text
    assert "Hochformat, 2:3" in text
    assert "Unbekannter schwarzer Fineliner" in text
    assert "s1-v1" in text


def test_v2_prompts_follow_the_official_structure() -> None:
    s2 = s2_prompt_v2("hatch the sail", "the boat", "landscape 3:2")
    assert "Image 1:" in s2
    assert "Image 2:" in s2
    assert "New strokes: hatch the sail." in s2
    assert "fully transparent background" in s2
    assert "checkerboard" in s2
    assert "the boat" in s2
    s1_text = s1_prompt_v2("hatch the sail", "the boat")
    assert s1_text.startswith("Image 1:")
    assert "Change only: hatch the sail" in s1_text
    assert "Keep exactly the same:" in s1_text
    assert "the boat" in s1_text
