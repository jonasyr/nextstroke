"""Sourced material sheet (docs/product/material-knowledge-base.md).

Claims carry source, evidence level, and confidence. Confidence is capped
by evidence level; community reports (E) are never facts.
"""

from __future__ import annotations

from datetime import date
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

EvidenceLevel = Literal["A", "B", "C", "D", "E"]
Confidence = Literal["high", "medium", "low"]
RANK = {"low": 0, "medium": 1, "high": 2}
MAX_CONFIDENCE: dict[str, Confidence] = {"A": "high", "B": "medium", "C": "high", "D": "medium"}
LEVEL_LABEL = {
    "A": "Norm/Zertifikat",
    "B": "Herstellerangabe",
    "C": "NextStroke-Test",
    "D": "unabhängiger Vergleich",
}
NonEmpty = Annotated[str, Field(min_length=1)]


class _Frozen(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)


class Subject(_Frozen):
    id: NonEmpty
    kind: Literal["fineliner", "paper"]
    name: NonEmpty
    generic: bool


class SourceRecord(_Frozen):
    id: NonEmpty
    title: NonEmpty
    publisher: NonEmpty
    url: NonEmpty
    source_type: Literal[
        "standard", "certification", "manufacturer", "nextstroke-test", "independent-test"
    ]
    retrieved_at: date
    license_note: NonEmpty


class MaterialClaim(_Frozen):
    id: NonEmpty
    subject_id: NonEmpty
    predicate: NonEmpty
    value: str | float | bool
    unit: str | None = None
    conditions: str | None = None
    source_id: NonEmpty
    evidence_level: EvidenceLevel
    confidence: Confidence
    verified_at: date

    @model_validator(mode="after")
    def _confidence_cap(self) -> MaterialClaim:
        if self.evidence_level == "E":
            raise ValueError(f"{self.id}: evidence level E is a research lead, not a fact")
        cap = MAX_CONFIDENCE[self.evidence_level]
        if RANK[self.confidence] > RANK[cap]:
            raise ValueError(
                f"{self.id}: confidence {self.confidence} exceeds {cap} "
                f"for level {self.evidence_level}"
            )
        return self


class GenericRule(_Frozen):
    id: NonEmpty
    text: NonEmpty


class MaterialSheet(_Frozen):
    schema_version: Literal["1"]
    subjects: list[Subject]
    sources: list[SourceRecord]
    claims: list[MaterialClaim]
    generic_rules: list[GenericRule]

    @model_validator(mode="after")
    def _references(self) -> MaterialSheet:
        ids = [
            *(s.id for s in self.subjects),
            *(s.id for s in self.sources),
            *(c.id for c in self.claims),
            *(r.id for r in self.generic_rules),
        ]
        if len(ids) != len(set(ids)):
            raise ValueError("duplicate id in material sheet")
        subjects = {s.id for s in self.subjects}
        sources = {s.id for s in self.sources}
        for claim in self.claims:
            if claim.source_id not in sources:
                raise ValueError(f"{claim.id}: unknown source {claim.source_id}")
            if claim.subject_id not in subjects:
                raise ValueError(f"{claim.id}: unknown subject {claim.subject_id}")
        return self


def render_prompt_block(sheet: MaterialSheet) -> str:
    """German text block for the Claude Project instructions."""
    lines = ["Materialblatt (nur diese Fakten verwenden; IDs in eckigen Klammern zitieren):", ""]
    for subject in sheet.subjects:
        lines.append(
            f"{subject.name}{' (generisch, unbekanntes Produkt)' if subject.generic else ''}:"
        )
        claims = [c for c in sheet.claims if c.subject_id == subject.id]
        for claim in claims:
            unit = f" {claim.unit}" if claim.unit else ""
            condition = f" (nur: {claim.conditions})" if claim.conditions else ""
            label = LEVEL_LABEL[claim.evidence_level]
            lines.append(
                f"- [{claim.id}] {claim.predicate}: {claim.value}{unit}{condition}"
                f" — {label}, Vertrauen {claim.confidence}"
            )
        if not claims:
            lines.append("- keine belegten Produktangaben; vorsichtige generische Regeln anwenden")
        lines.append("")
    lines.append("Generische Vorsichtsregeln (keine Produktangaben):")
    lines.extend(f"- [{rule.id}] {rule.text}" for rule in sheet.generic_rules)
    return "\n".join(lines)
