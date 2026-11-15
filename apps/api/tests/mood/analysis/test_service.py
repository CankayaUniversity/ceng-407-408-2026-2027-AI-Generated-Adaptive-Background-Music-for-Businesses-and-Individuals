import pytest

from app.clients.llm.schemas import ImageInput
from app.mood.analysis import service
from app.mood.analysis.exceptions import ImageTooLargeError, UnsupportedImageError
from app.mood.analysis.schemas import MoodAnalysis
from tests.mood.analysis.fakes import FakeLLM

PNG = b"\x89PNG\r\n\x1a\n" + b"\x00" * 16
JPEG = b"\xff\xd8\xff\xe0" + b"\x00" * 16
WEBP = b"RIFF\x24\x00\x00\x00WEBPVP8 " + b"\x00" * 16


@pytest.mark.parametrize(
    ("data", "expected"),
    [
        (PNG, "image/png"),
        (JPEG, "image/jpeg"),
        (WEBP, "image/webp"),
        (b"GIF89a....", None),
        (b"RIFF\x00\x00\x00\x00WAVEfmt ", None),
        (b"%PDF-1.7", None),
        (b"", None),
    ],
)
def test_detect_media_type_uses_magic_numbers(data: bytes, expected: str | None) -> None:
    assert service.detect_media_type(data) == expected


def test_validate_image_rejects_oversized_before_checking_type() -> None:
    with pytest.raises(ImageTooLargeError):
        service.validate_image(PNG + b"\x00" * service.MAX_IMAGE_BYTES)


def test_validate_image_rejects_unknown_content() -> None:
    with pytest.raises(UnsupportedImageError):
        service.validate_image(b"just some text")


def test_prompt_template_is_found_next_to_the_module() -> None:
    prompt = service.load_prompt()

    assert service.PROMPT_PATH.is_file()
    for axis in ("valence", "texture", "energy"):
        assert axis in prompt


async def test_analyze_image_sends_prompt_and_image_to_llm() -> None:
    fake = FakeLLM()

    result = await service.analyze_image(fake, PNG)

    assert result.summary == "Calm."
    (call,) = fake.calls
    assert call["schema"] is MoodAnalysis
    assert call["system"] == service.load_prompt()
    assert call["images"] == [ImageInput(data=PNG, media_type="image/png")]


async def test_analyze_image_validates_before_calling_llm() -> None:
    fake = FakeLLM()

    with pytest.raises(UnsupportedImageError):
        await service.analyze_image(fake, b"nope")

    assert fake.calls == []
