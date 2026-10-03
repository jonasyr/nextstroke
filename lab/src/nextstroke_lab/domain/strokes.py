"""Structured stroke plans for strategy S3 (spec §15.1).

Coordinates are normalized to the working image (0..1, origin top-left).
Width is a fraction of the working image's longest edge. Black ink only:
a fineliner cannot add white or color (AGENTS rule 7).
"""

from __future__ import annotations

from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

Coordinate = Annotated[float, Field(ge=0.0, le=1.0)]


class Stroke(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    order: Annotated[int, Field(ge=1)]
    points: Annotated[list[tuple[Coordinate, Coordinate]], Field(min_length=2, max_length=500)]
    width: Annotated[float, Field(gt=0.0, le=0.01)]
    darkness: Annotated[float, Field(gt=0.0, le=1.0)]


class StrokePlan(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    schema_version: Literal["1"]
    case_id: Annotated[str, Field(min_length=1)]
    strokes: Annotated[list[Stroke], Field(min_length=1, max_length=200)]

    @model_validator(mode="after")
    def _unique_order(self) -> StrokePlan:
        orders = [s.order for s in self.strokes]
        if len(orders) != len(set(orders)):
            raise ValueError("stroke order values must be unique")
        return self

    def ordered(self) -> list[Stroke]:
        return sorted(self.strokes, key=lambda s: s.order)
