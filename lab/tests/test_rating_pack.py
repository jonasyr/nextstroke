import json
from pathlib import Path

import pytest
from PIL import Image

from nextstroke_lab.domain.classification import Strategy
from nextstroke_lab.rating_pack import PackEntry, make_rating_pack


def _entry(tmp_path: Path, case_id: str, strategy: Strategy, attempt: int) -> PackEntry:
    folder = tmp_path / "candidates" / f"{case_id}-{strategy.value}-{attempt}"
    folder.mkdir(parents=True)
    images = {}
    for name in ("transparent", "white", "checkerboard", "original"):
        path = folder / f"{name}.png"
        Image.new("RGB", (4, 4)).save(path)
        images[name] = path
    return PackEntry(case_id=case_id, strategy=strategy, attempt=attempt, images=images)


def test_pack_hides_strategy_and_case_from_rater(tmp_path: Path) -> None:
    entries = [
        _entry(tmp_path, "c01", Strategy.S2, 1),
        _entry(tmp_path, "c01", Strategy.S3, 1),
        _entry(tmp_path, "c02", Strategy.S3, 2),
    ]
    pack = tmp_path / "pack"
    key = tmp_path / "key.json"
    make_rating_pack(entries, pack, key, seed=7)

    items = json.loads((pack / "items.json").read_text())
    assert len(items) == 3
    public = (pack / "items.json").read_text() + (pack / "index.html").read_text()
    for secret in ("c01", "c02", "s2-", "s3-"):
        assert secret not in public
    for item in items:
        for rel in item["images"].values():
            assert (pack / rel).exists()

    mapping = json.loads(key.read_text())
    assert {v["case_id"] for v in mapping.values()} == {"c01", "c02"}
    assert set(mapping) == {item["id"] for item in items}


def test_pack_order_is_shuffled_but_reproducible(tmp_path: Path) -> None:
    entries = [_entry(tmp_path, f"c{i:02}", Strategy.S3, 1) for i in range(8)]
    make_rating_pack(entries, tmp_path / "a", tmp_path / "ka.json", seed=1)
    make_rating_pack(entries, tmp_path / "b", tmp_path / "kb.json", seed=1)
    a = json.loads((tmp_path / "a" / "items.json").read_text())
    b = json.loads((tmp_path / "b" / "items.json").read_text())
    key = json.loads((tmp_path / "ka.json").read_text())
    assert [i["id"] for i in a] == [i["id"] for i in b]
    order = [key[i["id"]]["case_id"] for i in a]
    assert order != sorted(order)


def test_key_must_live_outside_the_pack(tmp_path: Path) -> None:
    entries = [_entry(tmp_path, "c01", Strategy.S3, 1)]
    with pytest.raises(ValueError, match="outside"):
        make_rating_pack(entries, tmp_path / "pack", tmp_path / "pack" / "key.json", seed=1)
