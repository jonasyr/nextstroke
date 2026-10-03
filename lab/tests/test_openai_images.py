import base64
import io
import json
import urllib.error
import urllib.request
from email import message_from_bytes
from email.message import Message

import pytest

from nextstroke_lab.adapters.openai_images import (
    EditRequest,
    OpenAIImagesClient,
    ProviderError,
    api_size,
    urllib_transport,
)
from nextstroke_lab.domain.costs import TokenUsage

PNG = b"\x89PNG fake"
USAGE = {
    "input_tokens": 10,
    "input_tokens_details": {"text_tokens": 4, "image_tokens": 6},
    "output_tokens": 20,
    "output_tokens_details": {"text_tokens": 0, "image_tokens": 20},
}


class FakeTransport:
    def __init__(self, status: int, body: bytes) -> None:
        self.status = status
        self.body = body
        self.calls: list[tuple[str, dict[str, str], bytes]] = []

    def __call__(self, url: str, headers: dict[str, str], body: bytes) -> tuple[int, bytes]:
        self.calls.append((url, headers, body))
        return self.status, self.body


def _ok() -> bytes:
    return json.dumps(
        {"data": [{"b64_json": base64.b64encode(PNG).decode()}], "usage": USAGE}
    ).encode()


def _fields(headers: dict[str, str], body: bytes) -> dict[str, bytes]:
    raw = f"Content-Type: {headers['Content-Type']}\r\n\r\n".encode() + body
    fields: dict[str, bytes] = {}
    for part in message_from_bytes(raw).get_payload():
        assert isinstance(part, Message)
        name = part.get_param("name", header="content-disposition")
        payload = part.get_payload(decode=True)
        assert isinstance(name, str)
        assert isinstance(payload, bytes)
        fields[name] = payload
    return fields


def test_edit_sends_multipart_without_credentials() -> None:
    transport = FakeTransport(200, _ok())
    client = OpenAIImagesClient(transport)
    request = EditRequest(
        model="gpt-image-2.5-sunburst",
        prompt="Möwen",
        image_png=b"img",
        mask_png=b"mask",
        size="1536x1024",
        quality="medium",
        background="opaque",
    )
    result = client.edit(request)
    assert result.png == PNG
    assert result.usage == TokenUsage(text_input=4, image_input=6, text_output=0, image_output=20)
    url, headers, body = transport.calls[0]
    assert url == "https://api.openai.com/v1/images/edits"
    assert not any(k.lower() == "authorization" for k in headers)
    fields = _fields(headers, body)
    assert fields["model"] == b"gpt-image-2.5-sunburst"
    assert fields["prompt"].decode() == "Möwen"
    assert fields["image"] == b"img"
    assert fields["mask"] == b"mask"
    assert fields["background"] == b"opaque"
    assert fields["output_format"] == b"png"
    assert fields["n"] == b"1"


def test_mask_is_optional() -> None:
    transport = FakeTransport(200, _ok())
    request = EditRequest("m", "p", b"img", None, "1024x1536", "medium", "transparent")
    OpenAIImagesClient(transport).edit(request)
    _, headers, body = transport.calls[0]
    assert "mask" not in _fields(headers, body)


def test_api_errors_carry_code_and_message() -> None:
    body = json.dumps({"error": {"code": "moderation_blocked", "message": "nope"}}).encode()
    client = OpenAIImagesClient(FakeTransport(400, body))
    with pytest.raises(ProviderError, match="400 moderation_blocked: nope") as info:
        client.edit(EditRequest("m", "p", b"i", None, "1024x1024", "low", "auto"))
    assert info.value.code == "moderation_blocked"


def test_unparseable_errors_still_raise() -> None:
    client = OpenAIImagesClient(FakeTransport(502, b"<html>"))
    with pytest.raises(ProviderError, match="502 http_error"):
        client.edit(EditRequest("m", "p", b"i", None, "1024x1024", "low", "auto"))


def test_a_response_without_an_image_is_an_error() -> None:
    body = json.dumps({"data": [], "usage": USAGE}).encode()
    client = OpenAIImagesClient(FakeTransport(200, body))
    with pytest.raises(ProviderError, match="no image"):
        client.edit(EditRequest("m", "p", b"i", None, "1024x1024", "low", "auto"))


def test_api_size_follows_orientation() -> None:
    assert api_size(735, 490) == "1536x1024"
    assert api_size(693, 1040) == "1024x1536"


class FakeResponse:
    def __init__(self, status: int, body: bytes) -> None:
        self.status = status
        self._body = body

    def read(self) -> bytes:
        return self._body

    def __enter__(self) -> "FakeResponse":
        return self

    def __exit__(self, *args: object) -> None:
        return None


def test_urllib_transport_returns_status_and_body(monkeypatch: pytest.MonkeyPatch) -> None:
    seen: dict[str, object] = {}

    def fake_urlopen(request: urllib.request.Request, timeout: float) -> FakeResponse:
        seen["method"] = request.get_method()
        seen["timeout"] = timeout
        return FakeResponse(200, b"ok")

    monkeypatch.setattr(urllib.request, "urlopen", fake_urlopen)
    assert urllib_transport("https://x.test", {"A": "b"}, b"data") == (200, b"ok")
    assert seen == {"method": "POST", "timeout": 300.0}


def test_urllib_transport_returns_http_errors(monkeypatch: pytest.MonkeyPatch) -> None:
    def fake_urlopen(request: urllib.request.Request, timeout: float) -> FakeResponse:
        raise urllib.error.HTTPError("https://x.test", 400, "bad", {}, io.BytesIO(b"err"))  # type: ignore[arg-type]

    monkeypatch.setattr(urllib.request, "urlopen", fake_urlopen)
    assert urllib_transport("https://x.test", {}, b"") == (400, b"err")
