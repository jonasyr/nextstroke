import numpy as np

from nextstroke_lab.domain.masks import provider_edit_mask


def test_editable_pixels_become_transparent_everything_else_opaque() -> None:
    editable = np.zeros((2, 3), dtype=np.bool_)
    editable[0, 1] = True
    mask = provider_edit_mask(editable)
    assert mask.shape == (2, 3, 4)
    assert mask.dtype == np.uint8
    assert mask[0, 1, 3] == 0
    assert mask[1, 2, 3] == 255
    assert (mask[..., :3] == 0).all()
