import numpy as np

from nextstroke_lab.domain.masks import provider_edit_mask, region_outline


def test_editable_pixels_become_transparent_everything_else_opaque() -> None:
    editable = np.zeros((2, 3), dtype=np.bool_)
    editable[0, 1] = True
    mask = provider_edit_mask(editable)
    assert mask.shape == (2, 3, 4)
    assert mask.dtype == np.uint8
    assert mask[0, 1, 3] == 0
    assert mask[1, 2, 3] == 255
    assert (mask[..., :3] == 0).all()


def test_region_outline_marks_only_the_border() -> None:
    mask = np.zeros((20, 20), dtype=np.bool_)
    mask[5:15, 5:15] = True
    edge = region_outline(mask, thickness=2)
    assert edge[5, 10]  # on the border
    assert not edge[10, 10]  # interior
    assert not edge[0, 0]  # far outside
