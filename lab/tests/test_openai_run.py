import io
import json
from datetime import UTC, datetime
from pathlib import Path

import numpy as np
import pytest
from PIL import Image

from nextstroke_lab.adapters.attempt_log import AttemptLog
from nextstroke_lab.adapters.openai_images import EditRequest, EditResult, ProviderError
from nextstroke_lab.domain.classification import Strategy
from nextstroke_lab.domain.costs import TokenUsage
from nextstroke_lab.openai_run import (
    ProtocolError,
    RunSettings,
    record_screening,
    run_attempt,
)

USAGE = TokenUsage(text_input=100, image_input=1000, text_output=0, image_output=2000)
# 100*5 + 1000*8 + 2000*30 = 68500 per million
COST = 0.0685


def _png(size: tuple[int, int], mode: str = "RGBA") -> bytes:
    pixels = np.zeros((size[1], size[0], 4 if mode == "RGBA" else 3), dtype=np.uint8)
    if mode == "RGBA":
        pixels[size[1] // 4, size[0] // 2 :, 3] = 255  # one stroke in the editable half
    else:
        pixels[...] = 235
    buffer = io.BytesIO()
    Image.fromarray(pixels, mode).save(buffer, format="PNG")
    return buffer.getvalue()


class FakeClient:
    def __init__(self, png: bytes | None = None, error: ProviderError | None = None) -> None:
        self.png = png if png is not None else _png((1536, 1024))
        self.error = error
        self.requests: list[EditRequest] = []

    def edit(self, request: EditRequest) -> EditResult:
        self.requests.append(request)
        if self.error is not None:
            raise self.error
        return EditResult(png=self.png, usage=USAGE)


class Clock:
    def __init__(self) -> None:
        self.ticks = iter([10.0, 22.5, 30.0, 41.0, 50.0, 60.0])

    def __call__(self) -> float:
        return next(self.ticks)


@pytest.fixture
def root(case_dir: Path) -> Path:
    for name in ("original.png", "editable.png", "protected.png"):  # make the case 3:2
        with Image.open(case_dir / name) as image:
            image.resize((450, 300), Image.Resampling.NEAREST).save(case_dir / name)
    (case_dir / "annotation.json").write_text(
        json.dumps(
            {
                "desired_change": "Zwei Möwen",
                "protected_description": "Linie",
                "owner_reviewed": True,
            }
        ),
        encoding="utf-8",
    )
    return case_dir.parent.parent


def _run(root: Path, client: FakeClient, short: str = "s2", attempt: int = 1, **kw: object):  # type: ignore[no-untyped-def]
    settings = RunSettings(**kw)  # type: ignore[arg-type]
    return run_attempt(
        root,
        "c01",
        short,
        attempt=attempt,
        client=client,
        settings=settings,
        clock=Clock(),
        now=lambda: datetime(2026, 10, 3, 18, 0, tzinfo=UTC),
    )


def test_s2_sends_reference_photo_and_frozen_prompt(root: Path) -> None:
    client = FakeClient()
    summary = _run(root, client)
    request = client.requests[0]
    assert request.model == "gpt-image-2.5-sunburst"
    assert request.mask_png is None
    assert request.background == "transparent"
    assert request.size == "1536x1024"
    assert request.quality == "medium"
    assert "NUR die neuen Striche für: Zwei Möwen" in request.prompt
    assert "Querformat, 3:2" in request.prompt
    with Image.open(io.BytesIO(request.image_png)) as sent:
        assert sent.size == (1536, 1024)
    assert summary["cost_usd"] == pytest.approx(COST)
    assert summary["audit_passed"] is True


def test_s2_attempt_is_logged_with_measured_latency_and_cost(root: Path) -> None:
    _run(root, FakeClient())
    (record,) = AttemptLog(root / "attempts.jsonl").read()
    assert record.strategy is Strategy.S2
    assert record.service == "openai"
    assert record.model_label == "gpt-image-2.5-sunburst (OpenAI Images API, quality medium)"
    assert record.prompt_revision == "s2-v1"
    assert record.latency_seconds == pytest.approx(12.5)
    assert record.cost_usd == pytest.approx(COST)
    assert record.usage == {
        "text_input": 100,
        "image_input": 1000,
        "text_output": 0,
        "image_output": 2000,
    }
    assert record.output_path == "outputs/c01-s2-1.png"
    assert (root / "outputs" / "c01-s2-1.png").exists()
    audit = root / "candidates" / "c01" / "s2-transparent-overlay" / "1" / "audit.json"
    assert json.loads(audit.read_text()) == {"passed": True, "violating_pixels": 0}


def test_s1_sends_the_editable_region_as_transparent_mask(root: Path) -> None:
    client = FakeClient(png=_png((1536, 1024), "RGB"))
    summary = _run(root, client, short="s1")
    request = client.requests[0]
    assert request.background == "opaque"
    assert "Ergänze nur im markierten Bereich: Zwei Möwen." in request.prompt
    assert request.mask_png is not None
    with Image.open(io.BytesIO(request.mask_png)) as mask:
        assert mask.size == (1536, 1024)
        alpha = np.asarray(mask.convert("RGBA"))[..., 3]
    assert alpha[512, 1400] == 0  # editable right half
    assert alpha[512, 100] == 255
    assert summary["audit_passed"] is True
    (record,) = AttemptLog(root / "attempts.jsonl").read()
    assert record.prompt_revision == "s1-v1"
    assert record.strategy is Strategy.S1


def test_s1_has_a_single_attempt(root: Path) -> None:
    with pytest.raises(ProtocolError, match="one attempt"):
        _run(root, FakeClient(), short="s1", attempt=2)


def test_s2_retry_needs_a_screened_non_controlled_previous_attempt(root: Path) -> None:
    _run(root, FakeClient())
    with pytest.raises(ProtocolError, match="screen attempt 1"):
        _run(root, FakeClient(), attempt=2)
    record_screening(root, "s2", "c01", attempt=1, screen="controlled", note="fine")
    with pytest.raises(ProtocolError, match="already controlled"):
        _run(root, FakeClient(), attempt=2)


def test_s2_retry_runs_after_an_experimental_screen(root: Path) -> None:
    _run(root, FakeClient())
    record_screening(root, "s2", "c01", attempt=1, screen="experimental", note="misplaced")
    summary = _run(root, FakeClient(), attempt=2)
    assert summary["attempt"] == 2
    assert summary["spent_usd"] == pytest.approx(2 * COST)


def test_unreviewed_annotations_are_refused(root: Path) -> None:
    path = root / "cases" / "c01" / "annotation.json"
    meta = json.loads(path.read_text())
    meta["owner_reviewed"] = False
    path.write_text(json.dumps(meta))
    with pytest.raises(ProtocolError, match="owner-reviewed"):
        _run(root, FakeClient())


def test_cap_stops_calls_before_they_are_sent(root: Path) -> None:
    client = FakeClient()
    with pytest.raises(Exception, match="cap"):
        _run(root, client, cap_usd=0.3)
    assert client.requests == []
    assert not (root / "attempts.jsonl").exists()


def test_provider_refusals_are_logged_as_failures(root: Path) -> None:
    error = ProviderError(400, "moderation_blocked", "blocked")
    summary = _run(root, FakeClient(error=error))
    (record,) = AttemptLog(root / "attempts.jsonl").read()
    assert record.failure == "400 moderation_blocked: blocked"
    assert record.output_path is None
    assert record.cost_usd == 0.0
    assert summary["failure"] == record.failure


def test_unregistrable_outputs_are_logged_and_reported(root: Path) -> None:
    summary = _run(root, FakeClient(png=_png((1024, 1024))))
    assert "does not match" in str(summary["candidate_error"])
    (record,) = AttemptLog(root / "attempts.jsonl").read()
    assert record.output_path == "outputs/c01-s2-1.png"


def test_screening_is_recorded_per_strategy_and_never_overwritten(root: Path) -> None:
    record_screening(root, "s2", "c01", attempt=1, screen="experimental", note="too dark")
    record_screening(root, "s1", "c01", attempt=1, screen="experimental", note="copyback")
    data = json.loads((root / "screening.json").read_text())
    assert data["s2"]["c01"] == [{"attempt": 1, "screen": "experimental", "note": "too dark"}]
    assert data["s1"]["c01"][0]["screen"] == "experimental"
    with pytest.raises(ProtocolError, match="already screened"):
        record_screening(root, "s2", "c01", attempt=1, screen="controlled", note="changed my mind")


def test_s1_can_never_screen_controlled(root: Path) -> None:
    with pytest.raises(ProtocolError, match="at most experimental"):
        record_screening(root, "s1", "c01", attempt=1, screen="controlled", note="")


def test_unknown_screens_are_refused(root: Path) -> None:
    with pytest.raises(ProtocolError, match="screen must be"):
        record_screening(root, "s2", "c01", attempt=1, screen="fine", note="")
