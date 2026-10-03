"""Per-case, copy-ready prompts from the frozen templates in protocol/prompts.md."""

from __future__ import annotations

import json
from pathlib import Path

from PIL import Image

DEFAULT_PEN = "Unbekannter schwarzer Fineliner"
DEFAULT_PAPER = "Unbekanntes Papier"


def _orientation(path: Path) -> str:
    with Image.open(path) as image:
        return "Querformat, 3:2" if image.width >= image.height else "Hochformat, 2:3"


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
Erzeuge ein PNG mit transparentem Hintergrund im Seitenverhältnis dieses Fotos ({orientation}).
Es enthält NUR die neuen Striche für: {change}, an genau der Stelle, an der sie auf diesem Foto
gezeichnet würden. Schwarze Fineliner-Linien. Kein Papier, keine vorhandenen Linien, kein Schatten,
kein Hintergrund, keine Farbe.
```

**ChatGPT S1 (`s1-v1`), neuer Chat, Bild hochladen, den grünen Bereich aus dem Prüfbogen
mit dem Bearbeiten-Pinsel markieren, dann:**

```text
Ergänze nur im markierten Bereich: {change}.
Schwarzer Fineliner, gleiche Strichstärke und gleicher Stil wie die vorhandenen Linien.
Alles andere bleibt exakt unverändert. Keine neuen Farben, kein Weiß, kein Schatten.
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
