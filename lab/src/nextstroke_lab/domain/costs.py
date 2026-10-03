"""Measured API cost and the hard Phase 0 spending cap (D-045)."""

from __future__ import annotations

from collections.abc import Mapping, Sequence
from dataclasses import dataclass

MIN_RESERVE_USD = 0.5
RESERVE_FACTOR = 1.5


class BudgetExceededError(RuntimeError):
    """The next call could push measured spend over the cap."""


@dataclass(frozen=True)
class TokenPrices:
    """USD per one million tokens."""

    text_input: float
    image_input: float
    image_output: float


# OpenAI pricing page, checked 2026-10-03: gpt-image-2.5-sunburst and -flare share these
# rates. Cached input is charged at the full rate and text output at the image output rate,
# so the measured cost is never an underestimate.
GPT_IMAGE_2_5_PRICES = TokenPrices(text_input=5.0, image_input=8.0, image_output=30.0)


@dataclass(frozen=True)
class TokenUsage:
    text_input: int
    image_input: int
    text_output: int
    image_output: int

    @classmethod
    def from_api(cls, usage: Mapping[str, object]) -> TokenUsage:
        """Parse an Images API `usage` object; undetailed tokens count as image tokens."""

        def detail(key: str) -> tuple[int, int]:
            total = int(str(usage.get(f"{key}_tokens", 0)))
            details = usage.get(f"{key}_tokens_details")
            if not isinstance(details, Mapping):
                return 0, total
            text = int(str(details.get("text_tokens", 0)))
            return text, total - text

        text_in, image_in = detail("input")
        text_out, image_out = detail("output")
        return cls(text_in, image_in, text_out, image_out)

    def as_dict(self) -> dict[str, int]:
        return {
            "text_input": self.text_input,
            "image_input": self.image_input,
            "text_output": self.text_output,
            "image_output": self.image_output,
        }


def cost_usd(usage: TokenUsage, prices: TokenPrices) -> float:
    per_million = (
        usage.text_input * prices.text_input
        + usage.image_input * prices.image_input
        + (usage.text_output + usage.image_output) * prices.image_output
    )
    return per_million / 1_000_000


def reserve_usd(observed: Sequence[float]) -> float:
    """Worst-case cost assumed for the next call."""
    return max(MIN_RESERVE_USD, RESERVE_FACTOR * max(observed, default=0.0))


def check_budget(spent: float, reserve: float, cap: float) -> None:
    if spent + reserve > cap:
        raise BudgetExceededError(
            f"spent USD {spent:.2f} + reserve {reserve:.2f} would exceed the cap of {cap:.2f}"
        )
