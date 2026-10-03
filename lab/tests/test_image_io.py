from pathlib import Path

import numpy as np
import pillow_heif
import pytest
from PIL import Image, ImageCms

from nextstroke_lab.adapters.image_io import (
    RegistrationError,
    fit_overlay,
    load_mask,
    load_working_image,
    save_png,
)


def _write(path: Path, size: tuple[int, int], color: tuple[int, int, int] = (10, 20, 30)) -> Path:
    Image.new("RGB", size, color).save(path)
    return path


def test_large_image_is_downscaled_to_working_edge(tmp_path: Path) -> None:
    image = load_working_image(_write(tmp_path / "big.jpg", (4032, 3024)), max_edge=2048)
    assert image.pixels.shape == (1536, 2048, 3)
    assert image.source_size == (4032, 3024)
    assert image.scale == pytest.approx(2048 / 4032)
    assert len(image.source_sha256) == 64


def test_small_image_is_never_upscaled(tmp_path: Path) -> None:
    image = load_working_image(_write(tmp_path / "small.png", (300, 200)), max_edge=2048)
    assert image.pixels.shape == (200, 300, 3)
    assert image.scale == 1.0


def test_exif_orientation_is_applied(tmp_path: Path) -> None:
    path = tmp_path / "rotated.jpg"
    exif = Image.Exif()
    exif[0x0112] = 6  # rotate 90° clockwise for display
    Image.new("RGB", (400, 200), (0, 0, 0)).save(path, exif=exif)
    image = load_working_image(path, max_edge=2048)
    assert image.pixels.shape == (400, 200, 3)


def test_rgba_and_grayscale_inputs_become_rgb(tmp_path: Path) -> None:
    rgba = tmp_path / "a.png"
    Image.new("RGBA", (10, 10), (1, 2, 3, 0)).save(rgba)
    gray = tmp_path / "g.png"
    Image.new("L", (10, 10), 7).save(gray)
    assert load_working_image(rgba).pixels.shape == (10, 10, 3)
    assert load_working_image(gray).pixels[0, 0].tolist() == [7, 7, 7]


def test_icc_profile_is_converted_to_srgb(tmp_path: Path) -> None:
    path = tmp_path / "icc.jpg"
    profile = ImageCms.ImageCmsProfile(ImageCms.createProfile("sRGB"))
    Image.new("RGB", (8, 8), (200, 100, 50)).save(path, icc_profile=profile.tobytes(), quality=100)
    pixel = load_working_image(path).pixels[0, 0].tolist()
    assert all(abs(a - b) <= 3 for a, b in zip(pixel, [200, 100, 50], strict=True))


def test_mask_is_resized_with_nearest_neighbour(tmp_path: Path) -> None:
    path = tmp_path / "mask.png"
    mask = Image.new("L", (100, 50), 0)
    mask.paste(255, (50, 0, 100, 50))
    mask.save(path)
    loaded = load_mask(path, (25, 50))
    assert loaded.dtype == np.bool_
    assert loaded.shape == (25, 50)
    assert loaded[:, 25:].all()
    assert not loaded[:, :25].any()


def test_overlay_is_fitted_to_working_size(tmp_path: Path) -> None:
    path = tmp_path / "overlay.png"
    Image.new("RGBA", (1024, 768), (0, 0, 0, 255)).save(path)
    fitted = fit_overlay(path, (1536, 2048))
    assert fitted.shape == (1536, 2048, 4)


def test_overlay_with_different_aspect_ratio_is_not_registered(tmp_path: Path) -> None:
    path = tmp_path / "overlay.png"
    Image.new("RGBA", (1024, 1024), (0, 0, 0, 255)).save(path)
    with pytest.raises(RegistrationError):
        fit_overlay(path, (1536, 2048))


def test_save_png_round_trips(tmp_path: Path) -> None:
    pixels = np.arange(2 * 3 * 4, dtype=np.uint8).reshape(2, 3, 4)
    target = tmp_path / "out" / "x.png"
    save_png(pixels, target)
    assert np.array_equal(np.asarray(Image.open(target)), pixels)


def test_heic_photos_load(tmp_path: Path) -> None:
    path = tmp_path / "photo.heic"
    pillow_heif.from_pillow(Image.new("RGB", (64, 48), (200, 10, 10))).save(path, quality=90)
    image = load_working_image(path)
    assert image.pixels.shape == (48, 64, 3)
    assert image.pixels[0, 0, 0] > 150
