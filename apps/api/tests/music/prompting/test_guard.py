import pytest

from app.music.prompting import guard


@pytest.mark.parametrize(
    "text",
    [
        "Upbeat pop in the style of The Beatles",
        "IN  THE   STYLE OF somebody",
        "Mellow piano that sounds like a rainy day in Paris",
        "something in the vein of old jazz",
        "A song like Radiohead with soft guitars",
        "Piano and strings, Beyoncé inspired",
        "Heavy riffs, AC/DC energy",
        "Epic orchestral theme for Star Wars",
        "Guns N\N{RIGHT SINGLE QUOTATION MARK} Roses ballad",
    ],
)
def test_references_are_found(text: str) -> None:
    assert guard.find_reference(text) is not None


@pytest.mark.parametrize(
    "text",
    [
        "Warm acoustic folk with fingerpicked guitar, around 80 BPM",
        "Like a warm blanket: slow pads and soft felt piano",
        "A quiet desert oasis at night, sparse synth pads",
        "Calm nirvana-like ambient drones",
        "Coldplayground of bright toy-piano sounds",
        "",
    ],
)
def test_clean_text_passes(text: str) -> None:
    assert guard.find_reference(text) is None


def test_find_reference_returns_the_matched_text() -> None:
    assert guard.find_reference("Pop in the style of Nobody") == "in the style of"
    assert guard.find_reference("a Daft Punk groove") == "daft punk"


def test_blocklist_is_modest_and_documented() -> None:
    assert 30 <= len(guard.BLOCKED_ARTISTS) <= 100
    assert guard.__doc__ is not None
    assert "not a complete filter" in guard.__doc__
