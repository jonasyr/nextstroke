"""Per-case, copy-ready prompts from the frozen templates in protocol/prompts.md."""

from __future__ import annotations

import json
from pathlib import Path

from PIL import Image

DEFAULT_PEN = "Unbekannter schwarzer Fineliner"
DEFAULT_PAPER = "Unbekanntes Papier"


S1_REVISION = "s1-v1"
S2_REVISION = "s2-v1"
S1_REVISION_V2 = "s1-v2"
S2_REVISION_V2 = "s2-v2"


def orientation_label(width: int, height: int) -> str:
    return "Querformat, 3:2" if width >= height else "Hochformat, 2:3"


def _orientation(path: Path) -> str:
    with Image.open(path) as image:
        return orientation_label(image.width, image.height)


def s2_prompt(change: str, orientation: str) -> str:
    """Frozen `s2-v1` text (protocol/prompts.md)."""
    return "\n".join(
        [
            "Erzeuge ein PNG mit transparentem Hintergrund im Seitenverhältnis dieses Fotos "
            f"({orientation}).",
            f"Es enthält NUR die neuen Striche für: {change}, an genau der Stelle, "
            "an der sie auf diesem Foto",
            "gezeichnet würden. Schwarze Fineliner-Linien. Kein Papier, keine vorhandenen Linien, "
            "kein Schatten,",
            "kein Hintergrund, keine Farbe.",
        ]
    )


def s1_prompt(change: str) -> str:
    """Frozen `s1-v1` text (protocol/prompts.md)."""
    return f"""Ergänze nur im markierten Bereich: {change}.
Schwarzer Fineliner, gleiche Strichstärke und gleicher Stil wie die vorhandenen Linien.
Alles andere bleibt exakt unverändert. Keine neuen Farben, kein Weiß, kein Schatten."""


# v2 (D-049) follows OpenAI's GPT Image 2.5 prompting guide, checked 2026-10-03: labeled
# sections, numbered image roles, "change only" plus an explicit preserve list, and a
# transparent-output prompt that describes no background (the prompt outranks the parameter).
STYLE_V2 = (
    "Style: black fineliner ink, thin uniform hand-drawn lines like the existing ones, "
    "pure black, no grey tones."
)


def s2_prompt_v2(change: str, protect: str, orientation: str) -> str:
    """Frozen `s2-v2` text."""
    return "\n".join(
        [
            f"Image 1: a photo of a black fineliner drawing on paper ({orientation}). "
            "It is the position reference.",
            "Image 2: the same photo with the allowed drawing area outlined in magenta.",
            "",
            "Task: create a transparent overlay that contains only new pen strokes. The overlay "
            "will be laid exactly on top of Image 1 at the same size and alignment, so every new "
            "stroke must be at the exact position where it would be drawn on Image 1.",
            "",
            f"New strokes: {change}.",
            "Placement: only inside the magenta outline of Image 2, aligned to the existing "
            "lines and shapes of Image 1.",
            STYLE_V2,
            f"Keep unchanged: {protect}. Existing lines are not part of the overlay.",
            "",
            "Output: only the new strokes on a fully transparent background.",
            "Do not include: the photo, paper, existing lines, the magenta outline, a "
            "checkerboard, a backdrop, shadows, grey tones, colour, solid fills, text or a frame.",
        ]
    )


def s1_prompt_v2(change: str, protect: str) -> str:
    """Frozen `s1-v2` text."""
    return "\n".join(
        [
            "Image 1: a photo of a black fineliner drawing on paper. Edit this image.",
            "Image 2: the same photo with the editable area outlined in magenta (reference only).",
            "",
            f"Change only: {change}, drawn inside the masked area (the magenta outline in "
            "Image 2).",
            STYLE_V2,
            f"Keep exactly the same: every existing line (position, shape, thickness), {protect}, "
            "the paper colour and texture, lighting, perspective, framing, crop and image size. "
            "Everything outside the masked area stays unchanged.",
            "Do not add: colour, white ink, grey wash or tonal shading, shadows, text, "
            "signatures, the magenta outline or any other object.",
        ]
    )


def _case_block(case: Path, pen: str, paper: str) -> str:
    meta = json.loads((case / "annotation.json").read_text(encoding="utf-8"))
    change = meta["desired_change"]
    protected = meta["protected_description"]
    orientation = _orientation(case / "original.png")
    return f"""## {case.name}

Bild hochladen: `{case.name}/original.png` ({orientation})

**Claude (Projekt, `ideas-s3-v1`), neuer Chat, Nachricht 1 mit Bild:**

```text
Fall {case.name}. Stift: {pen}. Papier: {paper}.
Ziel: eine kleine, sichere Ergänzung. Nicht verändern: {protected}.
```

**Claude, gleicher Chat, Nachricht 2:**

```text
Striche für: {change}
```

Speichern: Teil 1 als `{case.name}-ideas.json`, Teil 2 als `{case.name}-s3-<Versuch>.json`.

**ChatGPT S2 (`s2-v1`), neuer Chat, mit Bild:**

```text
{s2_prompt(change, orientation)}
```

**ChatGPT S1 (`s1-v1`), neuer Chat, Bild hochladen, den grünen Bereich aus dem Prüfbogen
mit dem Bearbeiten-Pinsel markieren, dann:**

```text
{s1_prompt(change)}
```
"""


def write_case_prompts(
    cases_root: Path, out: Path, pen: str = DEFAULT_PEN, paper: str = DEFAULT_PAPER
) -> int:
    cases = sorted(p for p in cases_root.iterdir() if (p / "annotation.json").exists())
    header = (
        "# Phase-0-Prompts je Fall\n\n"
        "Erzeugt aus `protocol/prompts.md` (Revisionen `ideas-s3-v1`, `s2-v1`, `s1-v1`). "
        "Jeden Versuch im Versuchsprotokoll eintragen, auch Ablehnungen.\n\n"
    )
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(header + "\n".join(_case_block(c, pen, paper) for c in cases), encoding="utf-8")
    return len(cases)
