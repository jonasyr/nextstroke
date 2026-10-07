"""Shape-shading spike: review sheet of areas and tone bands (private output)."""

import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw


def hatch(shape: tuple[int, int], angle: float, spacing: int) -> np.ndarray:
    h, w = shape
    y, x = np.mgrid[0:h, 0:w]
    a = np.deg2rad(angle)
    t = x * np.sin(a) - y * np.cos(a)
    return (np.mod(t, spacing) < 1.3)


def main(work: Path, out: Path) -> None:
    results = json.loads((work / "results.json").read_text())
    tiles = []
    for r in results:
        size = json.loads((work / f"{r['case']}.json").read_text())
        w, h = size["width"], size["height"]
        gray = np.frombuffer((work / f"{r['case']}.gray").read_bytes(), np.uint8).reshape(h, w)
        rgb = np.stack([gray] * 3, -1).astype(np.float32)
        label = f"{r['case']} {r['name']} ({r['kind']}) light {r['light']} {r['ms']} ms"
        if "file" in r:
            bands = np.frombuffer((work / r["file"]).read_bytes(), np.uint8).reshape(h, w)
            mask = bands > 0
            one = hatch((h, w), 45, 6)
            two = one | hatch((h, w), 135, 6)
            ink = ((bands == 2) & one) | ((bands == 3) & two)
            rgb[ink] = [20, 20, 24]
            edge = mask & ~np.roll(mask, 1, 0) | mask & ~np.roll(mask, 1, 1) | mask & ~np.roll(mask, -1, 0) | mask & ~np.roll(mask, -1, 1)
            rgb[edge] = [40, 120, 255]
            ys, xs = np.nonzero(mask)
            m = 30
            box = (max(0, xs.min() - m), max(0, ys.min() - m), min(w, xs.max() + m), min(h, ys.max() + m))
        else:
            label += f" REFUSED {r['refused']}"
            box = (0, 0, w, h)
        im = Image.fromarray(rgb.clip(0, 255).astype(np.uint8))
        d = ImageDraw.Draw(im)
        for tx, ty in r["taps"]:
            cx, cy = tx * (w - 1), ty * (h - 1)
            d.ellipse([cx - 6, cy - 6, cx + 6, cy + 6], outline=(255, 0, 0), width=3)
        im = im.crop(box)
        im.thumbnail((380, 380))
        tile = Image.new("RGB", (390, 410), "white")
        tile.paste(im, (5, 25))
        ImageDraw.Draw(tile).text((5, 5), label, fill=(0, 0, 0))
        tiles.append(tile)
    cols = 4
    for page in range(0, len(tiles), 12):
        group = tiles[page : page + 12]
        rows = (len(group) + cols - 1) // cols
        sheet = Image.new("RGB", (cols * 390, rows * 410), "white")
        for i, t in enumerate(group):
            sheet.paste(t, ((i % cols) * 390, (i // cols) * 410))
        sheet.save(out / f"sheet-{page // 12}.jpg", quality=85)


if __name__ == "__main__":
    main(Path(sys.argv[1]), Path(sys.argv[2]))
