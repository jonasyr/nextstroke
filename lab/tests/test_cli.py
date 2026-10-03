import io
import json
from datetime import UTC, datetime
from pathlib import Path

import numpy as np
import pytest
from PIL import Image

from nextstroke_lab import cli
from nextstroke_lab.adapters.attempt_log import AttemptLog, AttemptRecord
from nextstroke_lab.adapters.openai_images import EditRequest, EditResult
from nextstroke_lab.cli import main
from nextstroke_lab.domain.classification import Strategy
from nextstroke_lab.domain.costs import TokenUsage

ALL_PASS = dict.fromkeys(
    [
        "on_task",
        "readable",
        "registered",
        "correct_location",
        "matches_change",
        "no_critical_contour_destruction",
        "layer_clean",
        "fineliner_plausible",
        "executable",
        "understandable_in_isolation",
    ],
    True,
)


def _plan(tmp_path: Path) -> Path:
    plan = {
        "schema_version": "1",
        "case_id": "c01",
        "strokes": [
            {"order": 1, "points": [[0.6, 0.2], [0.9, 0.3]], "width": 0.004, "darkness": 1}
        ],
    }
    path = tmp_path / "plan.json"
    path.write_text(json.dumps(plan))
    return path


def _log(tmp_path: Path) -> Path:
    path = tmp_path / "attempts.jsonl"
    AttemptLog(path).append(
        AttemptRecord(
            case_id="c01",
            strategy=Strategy.S3,
            attempt=1,
            service="claude",
            model_label="Claude",
            prompt_revision="s3-v1",
            started_at=datetime(2026, 10, 5, tzinfo=UTC),
            latency_seconds=20.0,
            output_path="plan.json",
            output_sha256="0" * 64,
        )
    )
    return path


def _rate(pack: Path, key: Path, rubric: dict[str, bool]) -> Path:
    ids = json.loads(key.read_text())
    ratings = {item_id: {"rubric": rubric, "notes": ""} for item_id in ids}
    path = pack.parent / f"ratings-{pack.name}.json"
    path.write_text(json.dumps(ratings))
    return path


def test_end_to_end_candidate_pack_decide(
    case_dir: Path, tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    root = tmp_path / "candidates"
    assert (
        main(
            [
                "candidate",
                str(case_dir),
                "s3",
                str(_plan(tmp_path)),
                "--attempt",
                "1",
                "--out",
                str(root),
            ]
        )
        == 0
    )
    audit = json.loads((root / "c01" / "s3-structured-strokes" / "1" / "audit.json").read_text())
    assert audit["passed"] is True

    pack, key = tmp_path / "pack", tmp_path / "secret" / "key.json"
    assert main(["pack", str(root), "--out", str(pack), "--key", str(key), "--seed", "3"]) == 0
    ratings = _rate(pack, key, ALL_PASS)

    pack2, key2 = tmp_path / "pack2", tmp_path / "secret" / "key2.json"
    main(["pack", str(root), "--out", str(pack2), "--key", str(key2), "--seed", "4"])
    rereview = _rate(pack2, key2, {**ALL_PASS, "layer_clean": False})

    evidence = tmp_path / "evidence.json"
    evidence.write_text(
        json.dumps(
            {
                "study": {"participants": 6, "understood": 6, "not_worsened": 6},
                "device": {"cycles_completed": 10, "crashes_or_reloads": 0},
                "unreported_selection": False,
            }
        )
    )
    capsys.readouterr()
    code = main(
        [
            "decide",
            str(root),
            "--key",
            str(key),
            "--ratings",
            str(ratings),
            "--rereview-key",
            str(key2),
            "--rereview",
            str(rereview),
            "--log",
            str(_log(tmp_path)),
            "--evidence",
            str(evidence),
            "--cost",
            "s3=0.01",
        ]
    )
    report = json.loads(capsys.readouterr().out)
    assert code == 0
    assert report["outcome"] == "pivot"  # one case is not 21 of 30
    assert report["strategies"]["s3-structured-strokes"]["controlled"] == 0
    assert report["strategies"]["s3-structured-strokes"]["unnoticed_changes"] == 1


def test_unrated_candidate_is_an_error(case_dir: Path, tmp_path: Path) -> None:
    root = tmp_path / "candidates"
    main(
        [
            "candidate",
            str(case_dir),
            "s3",
            str(_plan(tmp_path)),
            "--attempt",
            "1",
            "--out",
            str(root),
        ]
    )
    key = tmp_path / "key.json"
    key.write_text(
        json.dumps({"abc": {"case_id": "c01", "strategy": "s3-structured-strokes", "attempt": 1}})
    )
    ratings = tmp_path / "ratings.json"
    ratings.write_text("{}")
    evidence = tmp_path / "evidence.json"
    evidence.write_text(json.dumps({"unreported_selection": False}))
    with pytest.raises(SystemExit, match="unrated"):
        main(
            [
                "decide",
                str(root),
                "--key",
                str(key),
                "--ratings",
                str(ratings),
                "--log",
                str(_log(tmp_path)),
                "--evidence",
                str(evidence),
            ]
        )


def test_bad_cost_argument_is_rejected() -> None:
    with pytest.raises(SystemExit):
        main(
            [
                "decide",
                "x",
                "--key",
                "k",
                "--ratings",
                "r",
                "--log",
                "l",
                "--evidence",
                "e",
                "--cost",
                "nope",
            ]
        )


def test_user_errors_exit_cleanly_without_traceback(
    tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    (tmp_path / "empty").mkdir()
    with pytest.raises(SystemExit) as exit_info:
        main(["candidate", str(tmp_path / "empty"), "s3", "x.json", "--attempt", "1", "--out", "o"])
    assert exit_info.value.code == 2
    assert "needs one of" in capsys.readouterr().err


def test_openai_run_and_screen_commands(
    case_dir: Path, monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
) -> None:
    for name in ("original.png", "editable.png", "protected.png"):
        with Image.open(case_dir / name) as image:
            image.resize((450, 300), Image.Resampling.NEAREST).save(case_dir / name)
    (case_dir / "annotation.json").write_text(
        json.dumps(
            {"desired_change": "Möwen", "protected_description": "x", "owner_reviewed": True}
        )
    )
    buffer = io.BytesIO()
    Image.fromarray(np.zeros((1024, 1536, 4), dtype=np.uint8), "RGBA").save(buffer, format="PNG")
    sent: list[EditRequest] = []

    class Client:
        def edit(self, request: EditRequest) -> EditResult:
            sent.append(request)
            return EditResult(buffer.getvalue(), TokenUsage(0, 0, 0, 1000))

    monkeypatch.setattr(cli, "default_images_client", Client)
    root = case_dir.parent.parent
    code = main(
        ["openai-run", str(root), "c01", "s2", "--attempt", "1", "--model", "gpt-image-2.5-flare"]
    )
    assert code == 0
    assert sent[0].model == "gpt-image-2.5-flare"
    assert json.loads(capsys.readouterr().out)["cost_usd"] == pytest.approx(0.03)
    assert main(["screen", str(root), "c01", "s2", "1", "experimental", "--note", "empty"]) == 0
    screening = json.loads((root / "screening.json").read_text())
    assert screening["s2"]["c01"][0]["note"] == "empty"
    with pytest.raises(SystemExit):
        main(["openai-run", str(root), "c01", "s1", "--attempt", "2"])
