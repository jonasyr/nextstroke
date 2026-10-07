"""Form v2: grayscale inputs at 768 px for one set (dev or test) of the private pool."""

import json
import sys
from pathlib import Path

from PIL import Image

LONG = 768


def main(pool: Path, work: Path, which: str) -> None:
    items = {i["id"]: i for i in json.loads((pool / "provenance.json").read_text())}
    split = json.loads((work / "split.json").read_text())
    out = work / which
    out.mkdir(exist_ok=True)
    for image_id in split[which]:
        image = Image.open(pool / items[image_id]["file"]).convert("L")
        scale = LONG / max(image.size)
        image = image.resize(
            (round(image.width * scale), round(image.height * scale)), Image.LANCZOS
        )
        (out / f"{image_id}.gray").write_bytes(image.tobytes())
        (out / f"{image_id}.json").write_text(
            json.dumps({"width": image.width, "height": image.height})
        )


if __name__ == "__main__":
    main(Path(sys.argv[1]), Path(sys.argv[2]), sys.argv[3])
