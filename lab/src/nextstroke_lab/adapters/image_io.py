"""Image loading and saving for the lab (spec §8 steps 1-3, §12 working budget)."""

from __future__ import annotations

import hashlib
import io
from dataclasses import dataclass
from pathlib import Path

import numpy as np
from numpy.typing import NDArray
from PIL import Image, ImageCms, ImageOps

DEFAULT_MAX_EDGE = 2048
ASPECT_TOLERANCE = 0.02


class RegistrationError(ValueError):
    """A provider output cannot be placed on the working image without guessing."""


@dataclass(frozen=True)
class WorkingImage:
    pixels: NDArray[np.uint8]
    source_size: tuple[int, int]  # width, height after orientation
    scale: float
    source_sha256: str


def _to_srgb(image: Image.Image) -> Image.Image:
    icc = image.info.get("icc_profile")
    if not icc:
        return image.convert("RGB")
    source = ImageCms.ImageCmsProfile(io.BytesIO(icc))
    target = ImageCms.createProfile("sRGB")
    converted = ImageCms.profileToProfile(image.convert("RGB"), source, target, outputMode="RGB")
    if converted is None:  # pragma: no cover - only for in-place conversion, never used
        raise RuntimeError("color conversion returned no image")
    return converted


def load_working_image(path: Path, max_edge: int = DEFAULT_MAX_EDGE) -> WorkingImage:
    data = path.read_bytes()
    with Image.open(io.BytesIO(data)) as raw:
        oriented = ImageOps.exif_transpose(raw)
        rgb = _to_srgb(oriented)
    width, height = rgb.size
    scale = min(1.0, max_edge / max(width, height))
    if scale < 1.0:
        size = (round(width * scale), round(height * scale))
        rgb = rgb.resize(size, Image.Resampling.LANCZOS)
    return WorkingImage(
        pixels=np.asarray(rgb, dtype=np.uint8).copy(),
        source_size=(width, height),
        scale=scale,
        source_sha256=hashlib.sha256(data).hexdigest(),
    )


def load_mask(path: Path, shape: tuple[int, int]) -> NDArray[np.bool_]:
    height, width = shape
    with Image.open(path) as raw:
        gray = raw.convert("L").resize((width, height), Image.Resampling.NEAREST)
    return np.asarray(gray) > 127


def fit_overlay(path: Path, shape: tuple[int, int]) -> NDArray[np.uint8]:
    height, width = shape
    with Image.open(path) as raw:
        rgba = raw.convert("RGBA")
    ratio = (rgba.width / rgba.height) / (width / height)
    if abs(ratio - 1.0) > ASPECT_TOLERANCE:
        raise RegistrationError(
            f"overlay aspect {rgba.width}x{rgba.height} does not match working {width}x{height}"
        )
    return np.asarray(rgba.resize((width, height), Image.Resampling.LANCZOS), dtype=np.uint8)


def save_png(pixels: NDArray[np.uint8], path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(pixels).save(path, format="PNG")
