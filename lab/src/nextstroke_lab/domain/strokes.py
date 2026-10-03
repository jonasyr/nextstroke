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


class Fill(BaseModel):
    """Parallel hatching clipped to a polygon (schema version 2, D-049).

    Angle 0 is horizontal, 90 vertical; spacing and width are fractions of the longest edge.
    `cross` adds a second pass at angle + 90.
    """

    model_config = ConfigDict(extra="forbid", frozen=True)

    order: Annotated[int, Field(ge=1)]
    polygon: Annotated[list[tuple[Coordinate, Coordinate]], Field(min_length=3, max_length=64)]
    angle_deg: Annotated[float, Field(ge=0.0, lt=180.0)]
    spacing: Annotated[float, Field(ge=0.002, le=0.05)]
    width: Annotated[float, Field(gt=0.0, le=0.01)]
    darkness: Annotated[float, Field(gt=0.0, le=1.0)]
    cross: bool = False


class StrokePlan(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    schema_version: Literal["1", "2"]
    case_id: Annotated[str, Field(min_length=1)]
    strokes: Annotated[list[Stroke], Field(max_length=200)]
    fills: Annotated[list[Fill], Field(max_length=20)] = []

    @model_validator(mode="after")
    def _valid_content(self) -> StrokePlan:
        if not self.strokes and not self.fills:
            raise ValueError("a plan needs strokes or fills")
        if self.fills and self.schema_version != "2":
            raise ValueError("fills need schema version 2")
        orders = [s.order for s in self.strokes] + [f.order for f in self.fills]
        if len(orders) != len(set(orders)):
            raise ValueError("stroke order values must be unique")
        return self

    def ordered(self) -> list[Stroke]:
        return sorted(self.strokes, key=lambda s: s.order)
