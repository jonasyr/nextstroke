"""Shape spike: a private pool of open drawings from the internet, for testing only (owner, 2026-10-07).

Images stay in lab/private/ and are never committed; provenance is kept per image.
"""

import json
import sys
import urllib.parse
import urllib.request
from pathlib import Path

UA = {"User-Agent": "NextStroke-lab/0.1 (research; testing only)"}
QUERIES = [
    "fineliner drawing",
    "ink drawing sketchbook",
    "micron pen drawing",
    "pen and ink illustration",
    "inktober",
    "line drawing doodle",
    "urban sketch ink",
    "ink sketch still life",
]


def get(url: str) -> bytes:
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30) as r:
        return r.read()


def openverse(per_query: int) -> list[dict]:
    found = []
    for q in QUERIES:
        url = "https://api.openverse.org/v1/images/?" + urllib.parse.urlencode(
            {"q": q, "page_size": per_query}
        )
        for r in json.loads(get(url))["results"]:
            found.append(
                {
                    "id": f"ov-{r['id'][:8]}",
                    "url": r["url"],
                    "source": r.get("foreign_landing_url") or r["url"],
                    "license": f"{r['license']} {r.get('license_version') or ''}".strip(),
                    "creator": r.get("creator"),
                    "title": r.get("title"),
                    "query": q,
                }
            )
    return found


def cleveland(limit: int) -> list[dict]:
    url = "https://openaccess-api.clevelandart.org/api/artworks/?" + urllib.parse.urlencode(
        {"q": "pen and black ink", "type": "Drawing", "cc0": 1, "has_image": 1, "limit": limit}
    )
    found = []
    for r in json.loads(get(url))["data"]:
        image = ((r.get("images") or {}).get("web") or {}).get("url")
        medium = (r.get("technique") or "").lower()
        if not image or "wash" in medium or "watercolor" in medium:
            continue
        found.append(
            {
                "id": f"cma-{r['id']}",
                "url": image,
                "source": r.get("url"),
                "license": "CC0",
                "creator": (r.get("creators") or [{}])[0].get("description"),
                "title": r.get("title"),
                "query": "cleveland pen and black ink",
            }
        )
    return found


def main(out: Path) -> None:
    out.mkdir(parents=True, exist_ok=True)
    pool = openverse(20) + cleveland(60)
    seen = set()
    kept = []
    for item in pool:
        if item["url"] in seen:
            continue
        seen.add(item["url"])
        try:
            data = get(item["url"])
        except Exception as error:  # noqa: BLE001 - a dead link is skipped
            print("skip", item["id"], error)
            continue
        suffix = ".png" if data[:4] == b"\x89PNG" else ".jpg"
        (out / f"{item['id']}{suffix}").write_bytes(data)
        item["file"] = f"{item['id']}{suffix}"
        kept.append(item)
    (out / "provenance.json").write_text(json.dumps(kept, indent=1))
    print(len(kept), "images")


if __name__ == "__main__":
    main(Path(sys.argv[1]))
