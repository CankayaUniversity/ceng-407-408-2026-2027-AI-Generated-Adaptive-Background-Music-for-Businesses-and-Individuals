import base64

import httpx
import pytest
from fastapi import FastAPI

from app.clients.llm.client import get_llm_client
from app.mood.analysis.service import MAX_IMAGE_BYTES
from tests.mood.analysis.fakes import FakeLLM

# A real 1x1 PNG.
TINY_PNG = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
)
URL = "/mood/analysis"


@pytest.fixture
def fake_llm(app: FastAPI) -> FakeLLM:
    fake = FakeLLM()
    app.dependency_overrides[get_llm_client] = lambda: fake
    return fake


def upload(content: bytes, content_type: str = "image/png") -> dict[str, tuple[str, bytes, str]]:
    return {"image": ("photo", content, content_type)}


async def test_valid_png_returns_vector_summary_and_tags(
    client: httpx.AsyncClient, fake_llm: FakeLLM
) -> None:
    response = await client.post(URL, files=upload(TINY_PNG))

    assert response.status_code == 200
    assert response.json() == {
        "vector": {"valence": 0.5, "texture": -0.5, "energy": 0.1},
        "summary": "Calm.",
        "tags": ["calm"],
    }
    (call,) = fake_llm.calls
    assert call["images"][0].media_type == "image/png"
    assert call["images"][0].data == TINY_PNG


async def test_oversized_upload_is_rejected_with_413(
    client: httpx.AsyncClient, fake_llm: FakeLLM
) -> None:
    big = TINY_PNG + b"\x00" * MAX_IMAGE_BYTES

    response = await client.post(URL, files=upload(big))

    assert response.status_code == 413
    assert response.json()["error"]["code"] == "image_too_large"
    assert fake_llm.calls == []


async def test_non_image_upload_is_rejected_with_415(
    client: httpx.AsyncClient, fake_llm: FakeLLM
) -> None:
    response = await client.post(URL, files=upload(b"%PDF-1.7 not an image", "application/pdf"))

    assert response.status_code == 415
    assert response.json()["error"]["code"] == "unsupported_image_type"
    assert fake_llm.calls == []


async def test_declared_image_type_does_not_make_other_bytes_acceptable(
    client: httpx.AsyncClient, fake_llm: FakeLLM
) -> None:
    response = await client.post(URL, files=upload(b"<html>nope</html>", "image/png"))

    assert response.status_code == 415
    assert fake_llm.calls == []


async def test_missing_image_field_is_a_validation_error(
    client: httpx.AsyncClient, fake_llm: FakeLLM
) -> None:
    response = await client.post(URL)

    assert response.status_code == 422


async def test_missing_llm_environment_gives_503_with_clear_message(
    client: httpx.AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    for name in ("LLM_BASE_URL", "LLM_API_KEY", "LLM_MODEL"):
        monkeypatch.delenv(name, raising=False)

    response = await client.post(URL, files=upload(TINY_PNG))

    assert response.status_code == 503
    error = response.json()["error"]
    assert error["code"] == "setup_required"
    for name in ("LLM_BASE_URL", "LLM_API_KEY", "LLM_MODEL"):
        assert name in error["message"]
