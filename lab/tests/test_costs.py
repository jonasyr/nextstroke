import pytest

from nextstroke_lab.domain.costs import (
    GPT_IMAGE_2_5_PRICES,
    BudgetExceededError,
    TokenUsage,
    check_budget,
    cost_usd,
    reserve_usd,
)


def test_cost_uses_per_million_token_prices() -> None:
    usage = TokenUsage(text_input=1000, image_input=2000, text_output=0, image_output=4000)
    # 1000*5 + 2000*8 + 4000*30 = 141000 per million
    assert cost_usd(usage, GPT_IMAGE_2_5_PRICES) == pytest.approx(0.141)


def test_text_output_is_charged_at_the_image_output_rate() -> None:
    usage = TokenUsage(text_input=0, image_input=0, text_output=1_000_000, image_output=0)
    assert cost_usd(usage, GPT_IMAGE_2_5_PRICES) == pytest.approx(30.0)


def test_usage_is_parsed_from_the_api_shape() -> None:
    usage = TokenUsage.from_api(
        {
            "input_tokens": 1300,
            "input_tokens_details": {"text_tokens": 100, "image_tokens": 1200},
            "output_tokens": 1600,
            "output_tokens_details": {"text_tokens": 0, "image_tokens": 1600},
            "total_tokens": 2900,
        }
    )
    assert usage == TokenUsage(text_input=100, image_input=1200, text_output=0, image_output=1600)


def test_missing_details_count_everything_at_the_expensive_rate() -> None:
    usage = TokenUsage.from_api({"input_tokens": 500, "output_tokens": 700})
    assert usage == TokenUsage(text_input=0, image_input=500, text_output=0, image_output=700)


def test_reserve_grows_with_the_most_expensive_observed_call() -> None:
    assert reserve_usd([]) == pytest.approx(0.5)
    assert reserve_usd([0.1, 0.6]) == pytest.approx(0.9)


def test_budget_refuses_a_call_that_could_cross_the_cap() -> None:
    check_budget(spent=4.0, reserve=0.5, cap=5.0)
    with pytest.raises(BudgetExceededError, match=r"4\.60"):
        check_budget(spent=4.6, reserve=0.5, cap=5.0)
