"""Application layer: one S1/S2 attempt via the OpenAI Images API (D-045).

Enforces the Phase 0 protocol around each call: owner-reviewed annotation, one S1 attempt,
up to three S2 attempts that stop at the first controlled screening (D-035), and a hard cap
on measured spend. Every call that reaches the provider is logged, including refusals.
"""

from __future__ import annotations

import hashlib
import json
import time
from collections.abc import Callable
from dataclasses import dataclass, field
from datetime import UTC, datetime
from pathlib import Path
from typing import Literal, Protocol

from nextstroke_lab.adapters.attempt_log import AttemptLog, AttemptRecord
from nextstroke_lab.adapters.case_prompts import (
    S1_REVISION,
    S2_REVISION,
    orientation_label,
    s1_prompt,
    s2_prompt,
)
from nextstroke_lab.adapters.image_io import RegistrationError, encode_png
from nextstroke_lab.adapters.openai_images import (
    EditRequest,
    EditResult,
    ProviderError,
    api_size,
)
from nextstroke_lab.domain.classification import Strategy
from nextstroke_lab.domain.costs import (
    GPT_IMAGE_2_5_PRICES,
    TokenPrices,
    check_budget,
    cost_usd,
    reserve_usd,
)
from nextstroke_lab.domain.decision import MAX_ATTEMPTS
from nextstroke_lab.domain.masks import provider_edit_mask
from nextstroke_lab.pipeline import build_candidate, load_case

Short = Literal["s1", "s2"]
STRATEGIES: dict[str, Strategy] = {"s1": Strategy.S1, "s2": Strategy.S2}
SCREENS = ("controlled", "experimental", "rejected")


class ProtocolError(ValueError):
    """The requested attempt would break the Phase 0 protocol."""


class ImagesClient(Protocol):
    def edit(self, request: EditRequest) -> EditResult: ...


@dataclass(frozen=True)
class RunSettings:
    model: str = "gpt-image-2.5-sunburst"
    quality: str = "medium"
    cap_usd: float = 5.0
    prices: TokenPrices = field(default=GPT_IMAGE_2_5_PRICES)


def _screens(root: Path) -> dict[str, dict[str, list[dict[str, object]]]]:
    path = root / "screening.json"
    if not path.exists():
        return {}
    data: dict[str, dict[str, list[dict[str, object]]]] = json.loads(path.read_text("utf-8"))
    return data


def record_screening(  # noqa: PLR0913 - keyword-only screening fields
    root: Path, short: str, case_id: str, *, attempt: int, screen: str, note: str
) -> None:
    """Append one orchestrator screening result; never overwrite an earlier one."""
    if screen not in SCREENS:
        raise ProtocolError(f"screen must be one of {', '.join(SCREENS)}")
    if short == "s1" and screen == "controlled":
        raise ProtocolError("S1 is at most experimental (spec §15.3)")
    data = _screens(root)
    entries = data.setdefault(short, {}).setdefault(case_id, [])
    if any(e["attempt"] == attempt for e in entries):
        raise ProtocolError(f"{case_id} {short} attempt {attempt} is already screened")
    entries.append({"attempt": attempt, "screen": screen, "note": note})
    (root / "screening.json").write_text(
        json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )


def _check_protocol(root: Path, case_dir: Path, short: str, attempt: int) -> str:
    if short == "s1" and attempt != 1:
        raise ProtocolError("S1 has one attempt per case (D-035)")
    if not 1 <= attempt <= MAX_ATTEMPTS:
        raise ProtocolError(f"attempt must be 1..{MAX_ATTEMPTS}")
    meta = json.loads((case_dir / "annotation.json").read_text(encoding="utf-8"))
    if not meta.get("owner_reviewed"):
        raise ProtocolError(f"{case_dir.name} annotation is not owner-reviewed")
    if attempt > 1:
        earlier = _screens(root).get(short, {}).get(case_dir.name, [])
        done = {int(str(e["attempt"])): e["screen"] for e in earlier}
        if attempt - 1 not in done:
            raise ProtocolError(f"screen attempt {attempt - 1} before running attempt {attempt}")
        if "controlled" in done.values():
            raise ProtocolError(f"{case_dir.name} {short} is already controlled; stop (D-035)")
    return str(meta["desired_change"])


def _request(case_dir: Path, short: str, change: str, settings: RunSettings) -> EditRequest:
    case = load_case(case_dir)
    height, width = case.masks.shape
    size_label = api_size(width, height)
    columns, rows = (int(v) for v in size_label.split("x"))
    target = (columns, rows)
    image = encode_png(case.working.pixels, target)
    if short == "s1":
        mask: bytes | None = encode_png(provider_edit_mask(case.masks.editable), target)
        prompt, background = s1_prompt(change), "opaque"
    else:
        mask = None
        prompt, background = s2_prompt(change, orientation_label(width, height)), "transparent"
    return EditRequest(
        settings.model, prompt, image, mask, size_label, settings.quality, background
    )


def run_attempt(  # noqa: PLR0913 - explicit collaborators keep the runner testable
    root: Path,
    case_id: str,
    short: str,
    *,
    attempt: int,
    client: ImagesClient,
    settings: RunSettings,
    clock: Callable[[], float] = time.monotonic,
    now: Callable[[], datetime] = lambda: datetime.now(UTC),
) -> dict[str, object]:
    case_dir = root / "cases" / case_id
    strategy = STRATEGIES[short]
    change = _check_protocol(root, case_dir, short, attempt)
    log = AttemptLog(root / "attempts.jsonl")
    costs = [r.cost_usd for r in log.read() if r.cost_usd is not None]
    check_budget(sum(costs), reserve_usd(costs), settings.cap_usd)

    request = _request(case_dir, short, change, settings)
    revision = S1_REVISION if short == "s1" else S2_REVISION
    started_at = now()
    start = clock()
    base = {
        "case_id": case_id,
        "strategy": strategy,
        "attempt": attempt,
        "service": "openai",
        "model_label": f"{settings.model} (OpenAI Images API, quality {settings.quality})",
        "prompt_revision": revision,
        "started_at": started_at,
    }
    summary: dict[str, object] = {"case_id": case_id, "strategy": short, "attempt": attempt}
    try:
        result = client.edit(request)
    except ProviderError as error:
        log.append(
            AttemptRecord(**base, latency_seconds=clock() - start, failure=str(error), cost_usd=0.0)
        )
        return {**summary, "failure": str(error), "spent_usd": sum(costs)}
    latency = clock() - start
    cost = cost_usd(result.usage, settings.prices)
    relative = f"outputs/{case_id}-{short}-{attempt}.png"
    output = root / relative
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_bytes(result.png)
    log.append(
        AttemptRecord(
            **base,
            latency_seconds=latency,
            output_path=relative,
            output_sha256=hashlib.sha256(result.png).hexdigest(),
            cost_usd=cost,
            usage=result.usage.as_dict(),
            notes=f"size {request.size}, background {request.background}",
        )
    )
    summary |= {
        "latency_seconds": round(latency, 1),
        "cost_usd": cost,
        "spent_usd": sum(costs) + cost,
        "output": relative,
    }
    out = root / "candidates" / case_id / strategy.value / str(attempt)
    try:
        candidate = build_candidate(load_case(case_dir), strategy, output, out)
    except RegistrationError as error:
        return {**summary, "candidate_error": str(error)}
    audit = {"passed": candidate.audit.passed, "violating_pixels": candidate.audit.violating_pixels}
    (out / "audit.json").write_text(json.dumps(audit), encoding="utf-8")
    return {**summary, "audit_passed": audit["passed"], "candidate": str(out)}
