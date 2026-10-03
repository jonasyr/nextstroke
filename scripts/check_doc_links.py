#!/usr/bin/env python3
"""Fail if a Markdown file links to a relative path that does not exist."""

from __future__ import annotations

import re
import sys
from pathlib import Path

LINK = re.compile(r"\]\(([^)#\s]+)(?:#[^)]*)?\)")
SKIP_DIRS = {".git", "node_modules", ".venv", "dist", "vendor"}


def broken_links(root: Path) -> list[str]:
    problems: list[str] = []
    for md in root.rglob("*.md"):
        if SKIP_DIRS.intersection(md.relative_to(root).parts):
            continue
        for target in LINK.findall(md.read_text(encoding="utf-8")):
            if re.match(r"^[a-z]+:", target):
                continue
            if not (md.parent / target).exists():
                problems.append(f"{md.relative_to(root)}: {target}")
    return problems


if __name__ == "__main__":
    found = broken_links(Path(__file__).resolve().parent.parent)
    for line in found:
        print(f"broken link: {line}")
    sys.exit(1 if found else 0)
