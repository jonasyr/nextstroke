"""OpenAI Images API edit adapter (D-045).

The API key is injected by the environment proxy for api.openai.com, so requests carry no
credentials and nothing here ever reads, prints, or logs a key.
"""

from __future__ import annotations

import base64
import json
import urllib.error
import urllib.request
import uuid
from collections.abc import Callable
from dataclasses import dataclass

from nextstroke_lab.domain.costs import TokenUsage

EDITS_URL = "https://api.openai.com/v1/images/edits"
TIMEOUT_SECONDS = 300.0

Transport = Callable[[str, dict[str, str], bytes], tuple[int, bytes]]


class ProviderError(RuntimeError):
    def __init__(self, status: int, code: str, message: str) -> None:
        super().__init__(f"{status} {code}: {message}")
        self.status = status
        self.code = code


@dataclass(frozen=True)
class EditRequest:
    model: str
    prompt: str
    image_png: bytes
    mask_png: bytes | None
    size: str
    quality: str
    background: str


@dataclass(frozen=True)
class EditResult:
    png: bytes
    usage: TokenUsage


def api_size(width: int, height: int) -> str:
    """Closest standard 3:2 output size for the working image's orientation."""
    return "1536x1024" if width >= height else "1024x1536"


def urllib_transport(url: str, headers: dict[str, str], body: bytes) -> tuple[int, bytes]:
    request = urllib.request.Request(url, data=body, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(request, timeout=TIMEOUT_SECONDS) as response:
            return int(response.status), bytes(response.read())
    except urllib.error.HTTPError as error:
        return error.code, error.read()


def _multipart(fields: dict[str, str], files: dict[str, bytes]) -> tuple[str, bytes]:
    boundary = uuid.uuid4().hex
    parts: list[bytes] = []
    for name, value in fields.items():
        parts.append(
            f'--{boundary}\r\nContent-Disposition: form-data; name="{name}"\r\n\r\n'.encode()
            + value.encode()
            + b"\r\n"
        )
    for name, data in files.items():
        parts.append(
            f'--{boundary}\r\nContent-Disposition: form-data; name="{name}"; '
            f'filename="{name}.png"\r\nContent-Type: image/png\r\n\r\n'.encode()
            + data
            + b"\r\n"
        )
    parts.append(f"--{boundary}--\r\n".encode())
    return f"multipart/form-data; boundary={boundary}", b"".join(parts)


def _error(status: int, body: bytes) -> ProviderError:
    try:
        error = json.loads(body)["error"]
        return ProviderError(status, str(error.get("code") or error.get("type")), error["message"])
    except (ValueError, KeyError, TypeError):
        return ProviderError(status, "http_error", body[:200].decode("utf-8", "replace"))


class OpenAIImagesClient:
    def __init__(self, transport: Transport = urllib_transport) -> None:
        self._transport = transport

    def edit(self, request: EditRequest) -> EditResult:
        fields = {
            "model": request.model,
            "prompt": request.prompt,
            "size": request.size,
            "quality": request.quality,
            "background": request.background,
            "output_format": "png",
            "n": "1",
        }
        files = {"image": request.image_png}
        if request.mask_png is not None:
            files["mask"] = request.mask_png
        content_type, body = _multipart(fields, files)
        status, raw = self._transport(EDITS_URL, {"Content-Type": content_type}, body)
        if status != 200:
            raise _error(status, raw)
        payload = json.loads(raw)
        data = payload.get("data") or []
        if not data or not data[0].get("b64_json"):
            raise ProviderError(status, "no_image", "response contained no image")
        return EditResult(
            png=base64.b64decode(data[0]["b64_json"]),
            usage=TokenUsage.from_api(payload.get("usage") or {}),
        )
