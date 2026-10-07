"""Shape-shading spike: grayscale inputs at 1024 px for the TypeScript runner (private data)."""

import json
import sys
from pathlib import Path

from PIL import Image

LONG = 1024


def main(cases: Path, out: Path) -> None:
    out.mkdir(parents=True, exist_ok=True)
    for case in sorted(p for p in cases.iterdir() if (p / "original.png").exists()):
        image = Image.open(case / "original.png").convert("L")
        scale = LONG / max(image.size)
        image = image.resize(
            (round(image.width * scale), round(image.height * scale)), Image.LANCZOS
        )
        (out / f"{case.name}.gray").write_bytes(image.tobytes())
        (out / f"{case.name}.json").write_text(
            json.dumps({"width": image.width, "height": image.height})
        )


if __name__ == "__main__":
    main(Path(sys.argv[1]), Path(sys.argv[2]))
