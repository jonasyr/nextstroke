import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from nextstroke_lab.cli import main
from nextstroke_lab.domain.materials import MaterialSheet, render_prompt_block

SHEET = Path(__file__).resolve().parent.parent / "protocol" / "material-sheet.json"

SOURCE = {
    "id": "src-x",
    "title": "X",
    "publisher": "P",
    "url": "https://example.com/x",
    "source_type": "manufacturer",
    "retrieved_at": "2026-10-03",
    "license_note": "facts paraphrased",
}
CLAIM = {
    "id": "x-ink",
    "subject_id": "pen-x",
    "predicate": "ink_type",
    "value": "Pigment",
    "source_id": "src-x",
    "evidence_level": "B",
    "confidence": "medium",
    "verified_at": "2026-10-03",
}
SUBJECT = {"id": "pen-x", "kind": "fineliner", "name": "X Liner", "generic": False}


def _sheet(**overrides: object) -> dict[str, object]:
    base: dict[str, object] = {
        "schema_version": "1",
        "subjects": [SUBJECT],
        "sources": [SOURCE],
        "claims": [CLAIM],
        "generic_rules": [{"id": "g-1", "text": "Kein Weiß."}],
    }
    base.update(overrides)
    return base


def test_published_sheet_is_valid() -> None:
    sheet = MaterialSheet.model_validate_json(SHEET.read_text(encoding="utf-8"))
    assert any(s.generic for s in sheet.subjects)
    assert len(sheet.claims) >= 20


def test_manufacturer_claim_cannot_exceed_medium_confidence() -> None:
    with pytest.raises(ValidationError, match="exceeds"):
        MaterialSheet.model_validate(_sheet(claims=[{**CLAIM, "confidence": "high"}]))


def test_community_claims_cannot_be_used_at_all() -> None:
    with pytest.raises(ValidationError, match="E"):
        MaterialSheet.model_validate(
            _sheet(claims=[{**CLAIM, "evidence_level": "E", "confidence": "low"}])
        )


def test_claim_needs_known_source_and_subject() -> None:
    with pytest.raises(ValidationError, match="unknown source"):
        MaterialSheet.model_validate(_sheet(claims=[{**CLAIM, "source_id": "nope"}]))
    with pytest.raises(ValidationError, match="unknown subject"):
        MaterialSheet.model_validate(_sheet(claims=[{**CLAIM, "subject_id": "nope"}]))


def test_ids_are_unique() -> None:
    with pytest.raises(ValidationError, match="duplicate"):
        MaterialSheet.model_validate(_sheet(claims=[CLAIM, CLAIM]))


def test_prompt_block_cites_every_claim_id() -> None:
    sheet = MaterialSheet.model_validate(_sheet())
    block = render_prompt_block(sheet)
    assert "[x-ink]" in block
    assert "X Liner" in block
    assert "Kein Weiß." in block
    assert "Herstellerangabe" in block


def test_published_prompt_block_mentions_all_claims() -> None:
    sheet = MaterialSheet.model_validate(json.loads(SHEET.read_text(encoding="utf-8")))
    block = render_prompt_block(sheet)
    assert all(f"[{c.id}]" in block for c in sheet.claims)


def test_cli_prints_prompt_block(capsys: pytest.CaptureFixture[str]) -> None:
    assert main(["material-sheet", str(SHEET)]) == 0
    out = capsys.readouterr().out
    assert out.startswith("Materialblatt")
    assert "[st308-capoff]" in out
