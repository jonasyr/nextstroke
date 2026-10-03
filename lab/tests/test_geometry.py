import pytest

from nextstroke_lab.domain.geometry import crop_box_3_2


@pytest.mark.parametrize(
    ("size", "box"),
    [
        ((4032, 3024), (0, 168, 4032, 2856)),  # 4:3 landscape -> trim top/bottom
        ((3024, 4032), (168, 0, 2856, 4032)),  # 4:3 portrait -> trim left/right
        ((3000, 2000), (0, 0, 3000, 2000)),  # already 3:2
        ((736, 1300), (0, 98, 736, 1202)),  # tall Pinterest pin -> trim top/bottom
        ((1000, 1000), (0, 166, 1000, 833)),  # square -> landscape 3:2
    ],
)
def test_center_crop_to_three_by_two(size: tuple[int, int], box: tuple[int, int, int, int]) -> None:
    assert crop_box_3_2(*size) == box


def test_result_has_three_by_two_ratio_within_a_pixel() -> None:
    left, top, right, bottom = crop_box_3_2(1234, 5678)
    width, height = right - left, bottom - top
    assert abs(height * 2 - width * 3) <= 3


def test_degenerate_size_is_rejected() -> None:
    with pytest.raises(ValueError, match="positive"):
        crop_box_3_2(0, 10)
