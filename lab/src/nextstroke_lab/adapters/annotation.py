"""Draft annotations: polygon masks, automatic ink protection, and a review sheet."""

from __future__ import annotations

import json
import math
from dataclasses import dataclass, field
from pathlib import Path
from typing import Annotated

import numpy as np
from numpy.typing import NDArray
from PIL import Image, ImageDraw, ImageFont
from pydantic import BaseModel, Field, TypeAdapter

from nextstroke_lab.adapters.image_io import save_png
from nextstroke_lab.domain.ink import detect_ink, dilate

Point = tuple[Annotated[float, Field(ge=0, le=1)], Annotated[float, Field(ge=0, le=1)]]
Polygons = list[Annotated[list[Point], Field(min_length=3)]]
POLYGONS = TypeAdapter(Polygons)
TILE_WIDTH = 480


class Annotation(BaseModel):
    case_id: str
    desired_change: str
    protected_description: str
    editable_polygons: Polygons
    extra_protected_polygons: Polygons
    ink_window: int
    ink_offset: int
    protect_margin_px: int
    critical_contour_in_editable: bool
    writable_fraction_of_editable: float
    annotator: str = "claude-draft"
    owner_reviewed: bool = False


def parse_polygons(text: str) -> Polygons:
    return POLYGONS.validate_json(text)


def rasterize(polygons: Polygons, shape: tuple[int, int]) -> NDArray[np.bool_]:
    height, width = shape
    canvas = Image.new("L", (width, height), 0)
    draw = ImageDraw.Draw(canvas)
    for polygon in polygons:
        draw.polygon([(x * (width - 1), y * (height - 1)) for x, y in polygon], fill=255)
    return np.asarray(canvas) > 127


@dataclass(frozen=True)
class AnnotationRequest:
    editable_polygons: Polygons
    desired_change: str
    protected_description: str
    extra_protected: Polygons = field(default_factory=list)
    ink_window: int = 31
    ink_offset: int = 25


def annotate_case(case_dir: Path, request: AnnotationRequest) -> Annotation:
    with Image.open(case_dir / "original.png") as raw:
        rgb = raw.convert("RGB")
    gray = np.asarray(rgb.convert("L"))
    shape = gray.shape[0], gray.shape[1]
    editable = rasterize(request.editable_polygons, shape)
    margin = max(2, round(0.01 * max(shape)))
    ink = dilate(detect_ink(gray, window=request.ink_window, offset=request.ink_offset), 2)
    protected = (ink & dilate(editable, margin)) | rasterize(request.extra_protected, shape)

    save_png(np.where(editable, 255, 0).astype(np.uint8), case_dir / "editable.png")
    save_png(np.where(protected, 255, 0).astype(np.uint8), case_dir / "protected.png")
    area = int(editable.sum())
    annotation = Annotation(
        case_id=case_dir.name,
        desired_change=request.desired_change,
        protected_description=request.protected_description,
        editable_polygons=request.editable_polygons,
        extra_protected_polygons=request.extra_protected,
        ink_window=request.ink_window,
        ink_offset=request.ink_offset,
        protect_margin_px=margin,
        critical_contour_in_editable=bool((protected & editable).any()),
        writable_fraction_of_editable=round(float((editable & ~protected).sum()) / area, 4)
        if area
        else 0.0,
    )
    (case_dir / "annotation.json").write_text(
        annotation.model_dump_json(indent=2), encoding="utf-8"
    )
    return annotation


def _tile(case_dir: Path) -> Image.Image:
    with Image.open(case_dir / "original.png") as raw:
        base = np.asarray(raw.convert("RGB")).astype(np.float64)
    shape = base.shape[0], base.shape[1]

    def mask(name: str) -> NDArray[np.bool_]:
        with Image.open(case_dir / name) as image:
            return np.asarray(image.convert("L").resize((shape[1], shape[0]))) > 127

    editable, protected = mask("editable.png"), mask("protected.png")
    out = base.copy()
    out[editable] = out[editable] * 0.6 + np.array([40, 200, 80]) * 0.4
    out[protected] = np.array([220, 30, 30])
    image = Image.fromarray(np.clip(out, 0, 255).astype(np.uint8))
    image = image.resize((TILE_WIDTH, round(TILE_WIDTH * shape[0] / shape[1])))
    meta_path = case_dir / "annotation.json"
    change = (
        json.loads(meta_path.read_text(encoding="utf-8"))["desired_change"]
        if meta_path.exists()
        else ""
    )
    labelled = Image.new("RGB", (TILE_WIDTH, image.height + 36), "white")
    labelled.paste(image, (0, 36))
    font = ImageFont.load_default(size=13)  # scalable font with umlauts
    ImageDraw.Draw(labelled).text(
        (6, 4), f"{case_dir.name}: {change}"[:90], fill="black", font=font
    )
    return labelled


def review_sheet(cases_root: Path, out: Path, columns: int = 3) -> int:
    cases = sorted(p for p in cases_root.iterdir() if (p / "editable.png").exists())
    tiles = [_tile(case) for case in cases]
    if not tiles:
        raise FileNotFoundError(f"no annotated cases in {cases_root}")
    columns = min(columns, len(tiles)) if len(tiles) > 1 else 2
    rows = math.ceil(len(tiles) / columns)
    cell_h = max(t.height for t in tiles)
    sheet = Image.new("RGB", (columns * TILE_WIDTH, rows * cell_h), "white")
    for index, tile in enumerate(tiles):
        sheet.paste(tile, ((index % columns) * TILE_WIDTH, (index // columns) * cell_h))
    out.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(out)
    return len(tiles)
