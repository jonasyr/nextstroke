"""Application layer: wires adapters to the pure domain for one case at a time."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import numpy as np
from numpy.typing import NDArray

from nextstroke_lab.adapters.image_io import (
    WorkingImage,
    fit_overlay,
    load_mask,
    load_working_image,
    save_png,
)
from nextstroke_lab.adapters.stroke_renderer import render_plan
from nextstroke_lab.domain.classification import Strategy
from nextstroke_lab.domain.compositing import (
    AuditResult,
    boundary_audit,
    composite_overlay,
    copy_back,
)
from nextstroke_lab.domain.masks import RegionMasks
from nextstroke_lab.domain.strokes import StrokePlan

BACKGROUNDS = ("transparent", "white", "checkerboard", "original")
ORIGINAL_NAMES = ("original.jpg", "original.jpeg", "original.png")


@dataclass(frozen=True)
class Case:
    case_id: str
    working: WorkingImage
    masks: RegionMasks


@dataclass(frozen=True)
class CandidateResult:
    composite_path: Path
    layer_path: Path | None
    background_paths: dict[str, Path]
    audit: AuditResult


def load_case(case_dir: Path) -> Case:
    found = [case_dir / n for n in ORIGINAL_NAMES if (case_dir / n).exists()]
    if not found:
        raise FileNotFoundError(f"{case_dir} needs one of {', '.join(ORIGINAL_NAMES)}")
    original = found[0]
    working = load_working_image(original)
    shape = working.pixels.shape[:2]
    editable = load_mask(case_dir / "editable.png", shape)
    protected = load_mask(case_dir / "protected.png", shape)
    feather_path = case_dir / "feather.png"
    feather = load_mask(feather_path, shape) if feather_path.exists() else np.zeros_like(editable)
    masks = RegionMasks(editable=editable, protected=protected, feather=feather & editable)
    return Case(case_id=case_dir.name, working=working, masks=masks)


def _checkerboard(shape: tuple[int, int], cell: int = 16) -> NDArray[np.uint8]:
    ys, xs = np.indices(shape)
    light = ((ys // cell + xs // cell) % 2).astype(bool)
    board = np.where(light, 255, 204).astype(np.uint8)
    return np.repeat(board[..., None], 3, axis=2)


def _on_background(layer: NDArray[np.uint8], background: NDArray[np.uint8]) -> NDArray[np.uint8]:
    alpha = layer[..., 3:4].astype(np.float64) / 255.0
    return np.rint(background * (1 - alpha) + layer[..., :3] * alpha).astype(np.uint8)


def _layer_for(case: Case, strategy: Strategy, source: Path) -> NDArray[np.uint8]:
    height, width = case.masks.shape
    if strategy is Strategy.S3:
        plan = StrokePlan.model_validate_json(source.read_text(encoding="utf-8"))
        if plan.case_id != case.case_id:
            raise ValueError(f"plan is for {plan.case_id}, not {case.case_id}")
        return render_plan(plan, width=width, height=height)
    return fit_overlay(source, (height, width))


def build_candidate(case: Case, strategy: Strategy, source: Path, out_dir: Path) -> CandidateResult:
    """Composite one provider output locally and audit the boundary (spec §8)."""
    working = case.working.pixels
    shape = case.masks.shape
    layer: NDArray[np.uint8] | None = None
    if strategy is Strategy.S1:
        candidate = fit_overlay(source, shape)[..., :3]
        composite = copy_back(working, candidate, case.masks)
    else:
        layer = _layer_for(case, strategy, source)
        layer = layer.copy()
        layer[..., 3] = np.where(case.masks.writable, layer[..., 3], 0)
        composite = composite_overlay(working, layer, case.masks)

    out_dir.mkdir(parents=True, exist_ok=True)
    composite_path = out_dir / "composite.png"
    save_png(composite, composite_path)
    backgrounds: dict[str, Path] = {}
    layer_path = None
    if layer is not None:
        layer_path = out_dir / "layer.png"
        save_png(layer, layer_path)
        fills = {
            "white": np.full((*shape, 3), 255, dtype=np.uint8),
            "checkerboard": _checkerboard(shape),
            "original": working,
        }
        backgrounds["transparent"] = layer_path
        for name, fill in fills.items():
            path = out_dir / f"on-{name}.png"
            save_png(_on_background(layer, fill), path)
            backgrounds[name] = path
    else:
        backgrounds = dict.fromkeys(BACKGROUNDS, composite_path)
    return CandidateResult(
        composite_path=composite_path,
        layer_path=layer_path,
        background_paths=backgrounds,
        audit=boundary_audit(working, composite, case.masks),
    )
