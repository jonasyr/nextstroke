"""Blinded rating pack (Phase 0 Task 5): randomized IDs, key kept outside the pack."""

from __future__ import annotations

import json
import random
import shutil
from dataclasses import dataclass
from importlib.resources import files
from pathlib import Path

from nextstroke_lab.domain.classification import Strategy


@dataclass(frozen=True)
class PackEntry:
    case_id: str
    strategy: Strategy
    attempt: int
    images: dict[str, Path]


def make_rating_pack(entries: list[PackEntry], pack_dir: Path, key_path: Path, seed: int) -> None:
    if pack_dir.resolve() in key_path.resolve().parents:
        raise ValueError("the key file must live outside the rating pack")
    rng = random.Random(seed)
    shuffled = entries[:]
    rng.shuffle(shuffled)

    items: list[dict[str, object]] = []
    key: dict[str, dict[str, object]] = {}
    for entry in shuffled:
        item_id = f"{rng.getrandbits(48):012x}"
        target = pack_dir / "items" / item_id
        target.mkdir(parents=True, exist_ok=True)
        images: dict[str, str] = {}
        for name, source in sorted(entry.images.items()):
            copied = target / f"{name}{source.suffix}"
            shutil.copyfile(source, copied)
            images[name] = copied.relative_to(pack_dir).as_posix()
        items.append({"id": item_id, "images": images})
        key[item_id] = {
            "case_id": entry.case_id,
            "strategy": entry.strategy.value,
            "attempt": entry.attempt,
        }

    (pack_dir / "items.json").write_text(json.dumps(items, indent=2), encoding="utf-8")
    page = files("nextstroke_lab").joinpath("rating_page.html").read_text(encoding="utf-8")
    (pack_dir / "index.html").write_text(page, encoding="utf-8")
    key_path.parent.mkdir(parents=True, exist_ok=True)
    key_path.write_text(json.dumps(key, indent=2), encoding="utf-8")
