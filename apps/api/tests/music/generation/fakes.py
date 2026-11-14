"""Stand-ins for the ElevenLabs client and for the retry sleep."""

from collections.abc import Sequence
from dataclasses import dataclass, field

from pydantic import SecretStr

from app.clients.elevenlabs.client import ElevenLabsClient
from app.clients.elevenlabs.config import ElevenLabsConfig

API_KEY = "sk-secret-key-1234567890"
MP3 = b"ID3\x04\x00\x00fake-mp3-bytes"


def make_config() -> ElevenLabsConfig:
    return ElevenLabsConfig(api_key=SecretStr(API_KEY), model_id="music_v2_5")


@dataclass
class Compose:
    prompt: str
    length_ms: int
    instrumental: bool


class FakeElevenLabs(ElevenLabsClient):
    """Answers each ``compose`` call with the next outcome: MP3 bytes, or an error to raise."""

    def __init__(self, outcomes: Sequence[bytes | Exception]) -> None:
        super().__init__(make_config())
        self.outcomes = list(outcomes)
        self.calls: list[Compose] = []

    async def compose(
        self,
        prompt: str,
        length_ms: int,
        instrumental: bool,
        output_format: str | None = None,
    ) -> bytes:
        self.calls.append(Compose(prompt, length_ms, instrumental))
        if not self.outcomes:
            raise AssertionError("compose was called more often than the test scripted")
        outcome = self.outcomes.pop(0)
        if isinstance(outcome, Exception):
            raise outcome
        return outcome


@dataclass
class RecordingSleep:
    """Replaces ``asyncio.sleep``: records the requested delays and returns at once."""

    delays: list[float] = field(default_factory=list)

    async def __call__(self, seconds: float) -> None:
        self.delays.append(seconds)
