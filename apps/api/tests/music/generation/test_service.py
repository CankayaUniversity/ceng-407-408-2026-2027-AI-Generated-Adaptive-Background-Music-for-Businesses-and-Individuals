import asyncio
import inspect

import pytest

from app.clients.elevenlabs.exceptions import (
    ElevenLabsAuthError,
    ElevenLabsBadPromptError,
    ElevenLabsError,
    ElevenLabsRateLimitError,
    ElevenLabsValidationError,
)
from app.music.generation import service
from tests.music.generation.fakes import MP3, FakeElevenLabs, RecordingSleep

PROMPT = "Calm ambient piano with soft pads"


async def generate(client: FakeElevenLabs, sleep: RecordingSleep) -> bytes:
    return await service.generate_track(client, PROMPT, 30_000, True, sleep=sleep)


def test_sleep_defaults_to_asyncio_sleep() -> None:
    assert inspect.signature(service.generate_track).parameters["sleep"].default is asyncio.sleep


async def test_success_passes_the_arguments_through() -> None:
    client, sleep = FakeElevenLabs([MP3]), RecordingSleep()

    audio = await service.generate_track(client, PROMPT, 45_000, False, sleep=sleep)

    assert audio == MP3
    (call,) = client.calls
    assert (call.prompt, call.length_ms, call.instrumental) == (PROMPT, 45_000, False)
    assert sleep.delays == []


async def test_rate_limit_is_retried_after_one_second() -> None:
    client = FakeElevenLabs([ElevenLabsRateLimitError("slow down"), MP3])
    sleep = RecordingSleep()

    audio = await generate(client, sleep)

    assert audio == MP3
    assert len(client.calls) == 2
    assert sleep.delays == [1.0]


async def test_backoff_doubles_on_the_second_retry() -> None:
    client = FakeElevenLabs([ElevenLabsRateLimitError(), ElevenLabsRateLimitError(), MP3])
    sleep = RecordingSleep()

    audio = await generate(client, sleep)

    assert audio == MP3
    assert len(client.calls) == 3
    assert sleep.delays == [1.0, 2.0]


async def test_retry_after_is_honoured() -> None:
    client = FakeElevenLabs([ElevenLabsRateLimitError(retry_after=7.5), MP3])
    sleep = RecordingSleep()

    await generate(client, sleep)

    assert sleep.delays == [7.5]


async def test_very_long_retry_after_is_capped() -> None:
    client = FakeElevenLabs([ElevenLabsRateLimitError(retry_after=3_600), MP3])
    sleep = RecordingSleep()

    await generate(client, sleep)

    assert sleep.delays == [60.0]


async def test_rate_limit_three_times_raises_after_three_attempts() -> None:
    errors = [ElevenLabsRateLimitError(f"limit {n}") for n in range(3)]
    client = FakeElevenLabs([*errors, MP3])
    sleep = RecordingSleep()

    with pytest.raises(ElevenLabsRateLimitError) as info:
        await generate(client, sleep)

    assert info.value is errors[2]
    assert len(client.calls) == 3
    assert sleep.delays == [1.0, 2.0]


async def test_bad_prompt_is_retried_once_with_the_suggestion() -> None:
    refusal = ElevenLabsBadPromptError("no artists", prompt_suggestion="  Warm acoustic folk  ")
    client = FakeElevenLabs([refusal, MP3])
    sleep = RecordingSleep()

    audio = await generate(client, sleep)

    assert audio == MP3
    assert [call.prompt for call in client.calls] == [PROMPT, "Warm acoustic folk"]
    assert all(call.length_ms == 30_000 and call.instrumental for call in client.calls)
    assert sleep.delays == []


async def test_bad_prompt_twice_raises_after_one_retry() -> None:
    second = ElevenLabsBadPromptError("still no", prompt_suggestion="Another suggestion")
    client = FakeElevenLabs([ElevenLabsBadPromptError(prompt_suggestion="First fix"), second, MP3])

    with pytest.raises(ElevenLabsBadPromptError) as info:
        await generate(client, RecordingSleep())

    assert info.value is second
    assert [call.prompt for call in client.calls] == [PROMPT, "First fix"]


@pytest.mark.parametrize("suggestion", [None, "", "   "])
async def test_bad_prompt_without_a_suggestion_is_not_retried(suggestion: str | None) -> None:
    client = FakeElevenLabs([ElevenLabsBadPromptError(prompt_suggestion=suggestion), MP3])

    with pytest.raises(ElevenLabsBadPromptError):
        await generate(client, RecordingSleep())

    assert len(client.calls) == 1


async def test_rate_limit_and_bad_prompt_budgets_are_independent() -> None:
    client = FakeElevenLabs(
        [
            ElevenLabsRateLimitError(),
            ElevenLabsBadPromptError(prompt_suggestion="Fixed"),
            ElevenLabsRateLimitError(),
            MP3,
        ]
    )
    sleep = RecordingSleep()

    audio = await generate(client, sleep)

    assert audio == MP3
    assert [call.prompt for call in client.calls] == [PROMPT, PROMPT, "Fixed", "Fixed"]
    assert sleep.delays == [1.0, 2.0]


@pytest.mark.parametrize(
    "error",
    [
        ElevenLabsAuthError("invalid key"),
        ElevenLabsValidationError("bad parameters"),
        ElevenLabsError("boom", upstream_status=500),
    ],
)
async def test_other_errors_are_not_retried(error: ElevenLabsError) -> None:
    client, sleep = FakeElevenLabs([error, MP3]), RecordingSleep()

    with pytest.raises(ElevenLabsError) as info:
        await generate(client, sleep)

    assert info.value is error
    assert len(client.calls) == 1
    assert sleep.delays == []
