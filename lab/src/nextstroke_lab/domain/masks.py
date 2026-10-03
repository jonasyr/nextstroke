"""Region masks from spec §8: editable region, protected geometry, feather band."""

from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np
from numpy.typing import NDArray

BoolMask = NDArray[np.bool_]


class MaskError(ValueError):
    """Raised when masks violate the spec §8 invariants."""


@dataclass(frozen=True)
class RegionMasks:
    """Masks in working-image pixel coordinates.

    Invariants: all masks are 2-D boolean arrays of one shape, the feather band
    lies inside the editable region, and protected geometry wins over editable.
    """

    editable: BoolMask
    protected: BoolMask
    feather: BoolMask
    writable: BoolMask = field(init=False, repr=False)

    def __post_init__(self) -> None:
        masks = (self.editable, self.protected, self.feather)
        if any(m.dtype != np.bool_ for m in masks):
            raise MaskError("masks must be boolean arrays")
        if any(m.ndim != 2 for m in masks):
            raise MaskError("masks must be 2-D")
        if len({m.shape for m in masks}) != 1:
            raise MaskError("mask shape mismatch")
        if (self.feather & ~self.editable).any():
            raise MaskError("feather band must lie inside the editable region")
        object.__setattr__(self, "writable", self.editable & ~self.protected)

    @property
    def shape(self) -> tuple[int, int]:
        height, width = self.editable.shape
        return height, width
