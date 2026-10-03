"""Print the S3 stroke-plan JSON schema that the Claude prompt references."""

from __future__ import annotations

import json

from nextstroke_lab.domain.strokes import StrokePlan


def main() -> None:
    print(json.dumps(StrokePlan.model_json_schema(), indent=2, ensure_ascii=False))


if __name__ == "__main__":  # pragma: no cover
    main()
