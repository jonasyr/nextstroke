"""Form v2: review sheet, v1 and v2 side by side per tapped object (private output)."""

import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw


def hatch(shape, angle, spacing):
    h, w = shape
    y, x = np.mgrid[0:h, 0:w]
    a = np.deg2rad(angle)
    return np.mod(x * np.sin(a) - y * np.cos(a), spacing) < 1.3


def tile(work: Path, out: Path, r: dict, label: str) -> Image.Image:
    size = json.loads((work / f"{r['image']}.json").read_text())
    w, h = size["width"], size["height"]
    gray = np.frombuffer((work / f"{r['image']}.gray").read_bytes(), np.uint8).reshape(h, w)
    rgb = np.stack([gray] * 3, -1).astype(np.float32)
    text = f"{label} {r['name']} [{r['expect']}] "
    if "file" in r:
        bands = np.frombuffer((out / r["file"]).read_bytes(), np.uint8).reshape(h, w)
        mask = bands > 0
        rgb[mask] = rgb[mask] * 0.6 + np.array([143, 176, 255]) * 0.4
        one = hatch((h, w), 45, 6)
        rgb[((bands == 2) & one) | ((bands == 3) & (one | hatch((h, w), 135, 6)))] = [20, 20, 24]
        text += f"AREA {r['ms']}ms {r.get('suggested', '')}"
    else:
        text += f"REFUSED {r['refused']} {r['ms']}ms"
    im = Image.fromarray(rgb.clip(0, 255).astype(np.uint8))
    d = ImageDraw.Draw(im)
    cx, cy = r["tap"][0] * (w - 1), r["tap"][1] * (h - 1)
    d.ellipse([cx - 7, cy - 7, cx + 7, cy + 7], outline=(255, 0, 0), width=3)
    im.thumbnail((300, 300))
    t = Image.new("RGB", (310, 325), "white")
    t.paste(im, (5, 22))
    ImageDraw.Draw(t).text((4, 4), text, fill=(0, 0, 0))
    return t


def main(work: Path, a: Path, b: Path, out: Path, prefix: str) -> None:
    ra = json.loads((a / "results.json").read_text())
    rb = json.loads((b / "results.json").read_text())
    pairs = [(tile(work, a, x, "v1"), tile(work, b, y, f"#{y['index']} v2")) for x, y in zip(ra, rb)]
    per = 6
    for p in range(0, len(pairs), per):
        group = pairs[p : p + per]
        sheet = Image.new("RGB", (4 * 310, ((len(group) + 1) // 2) * 325), "white")
        for i, (l, r) in enumerate(group):
            sheet.paste(l, ((i % 2) * 620, (i // 2) * 325))
            sheet.paste(r, ((i % 2) * 620 + 310, (i // 2) * 325))
        sheet.save(out / f"{prefix}-{p // per}.jpg", quality=82)


if __name__ == "__main__":
    main(Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3]), Path(sys.argv[4]), sys.argv[5])
