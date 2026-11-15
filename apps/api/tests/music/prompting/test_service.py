import json

import pytest

from app.clients.llm.exceptions import LLMResponseError
from app.mood.vector import MoodVector
from app.music.prompting import service
from app.music.prompting.constants import DEFAULT_COUNT, MAX_COUNT, MIN_COUNT
from app.music.prompting.schemas import PromptPlan
from tests.music.prompting.fakes import ScriptedLLM, plan_json, plan_with

MOOD = MoodVector(valence=0.6, texture=-0.7, energy=-0.4)


async def plan(llm: ScriptedLLM, count: int = DEFAULT_COUNT) -> PromptPlan:
    return await service.plan_prompts(llm, MOOD, "A quiet sunny kitchen.", ["calm", "warm"], count)


def test_prompt_template_is_found_next_to_the_module() -> None:
    assert service.PROMPT_PATH.is_file()
    assert service.PROMPT_PATH.name == "plan.md"
    assert service.PROMPT_PATH.parent.name == "prompts"


def test_default_count_is_five() -> None:
    assert DEFAULT_COUNT == 5


@pytest.mark.parametrize("count", [MIN_COUNT, 12, MAX_COUNT])
async def test_counts_in_range_return_that_many_prompts(count: int) -> None:
    llm = ScriptedLLM([plan_json(count)])

    result = await plan(llm, count)

    assert len(result.prompts) == count
    assert len(llm.calls) == 1
    first = result.prompts[0]
    assert (first.title, first.instrumental) == ("Morning Light 0", True)
    assert 3_000 <= first.length_ms <= 600_000


@pytest.mark.parametrize("count", [-1, 0, 4, 26, 100])
async def test_counts_out_of_range_raise_value_error_before_calling_the_llm(count: int) -> None:
    llm = ScriptedLLM([])

    with pytest.raises(ValueError, match="between 5 and 25"):
        await plan(llm, count)

    assert llm.calls == []


async def test_request_to_the_llm_contains_the_mood_values() -> None:
    llm = ScriptedLLM([plan_json(7)])

    await plan(llm, 7)

    user = llm.user_text()
    assert "valence: +0.60 (clearly happy)" in user
    assert "texture: -0.70 (clearly acoustic)" in user
    assert "energy: -0.40 (slightly calm)" in user
    assert "A quiet sunny kitchen." in user
    assert "calm, warm" in user
    assert "7 songs" in user


async def test_system_prompt_comes_from_the_template_with_count_and_length_range() -> None:
    llm = ScriptedLLM([plan_json(7)])

    await plan(llm, 7)

    system = llm.system_text()
    assert "exactly 7 songs" in system
    assert "3000 to 600000" in system
    assert "$" not in system
    assert "never name a real artist" in system.lower()


def test_describe_axis_names_the_strength_and_the_pole() -> None:
    assert service.describe_axis(0.0, "sad", "happy") == "+0.00 (neutral between sad and happy)"
    assert service.describe_axis(-0.9, "sad", "happy") == "-0.90 (very sad)"
    assert service.describe_axis(0.2, "sad", "happy") == "+0.20 (slightly happy)"


async def test_duplicate_prompts_are_repaired_on_retry() -> None:
    duplicated = plan_with(
        5,
        3,
        prompt="  WARM ACOUSTIC FOLK WITH FINGERPICKED GUITAR, take 0, relaxed tempo around 80 bpm",
    )
    llm = ScriptedLLM([duplicated, plan_json(5)])

    result = await plan(llm)

    assert len(result.prompts) == 5
    assert len(llm.calls) == 2
    assert "repeat" in llm.last_message_text(1)


async def test_duplicate_titles_are_case_insensitive() -> None:
    duplicated = plan_with(5, 2, title="morning LIGHT 0")
    llm = ScriptedLLM([duplicated, plan_json(5)])

    await plan(llm)

    assert len(llm.calls) == 2
    assert "titles" in llm.last_message_text(1)


async def test_duplicates_in_the_repair_too_fail() -> None:
    duplicated = plan_with(5, 3, title="Morning Light 0")
    llm = ScriptedLLM([duplicated, duplicated])

    with pytest.raises(LLMResponseError):
        await plan(llm)

    assert len(llm.calls) == 2


async def test_artist_style_reference_is_rejected_then_repaired() -> None:
    offending = plan_with(5, 1, prompt="Cheerful pop in the style of The Beatles, 120 BPM")
    llm = ScriptedLLM([offending, plan_json(5)])

    result = await plan(llm)

    assert len(llm.calls) == 2
    repair = llm.last_message_text(1)
    assert "prompts.1.prompt" in repair
    assert "in the style of" in repair
    assert all("beatles" not in item.prompt.lower() for item in result.prompts)


async def test_artist_name_in_a_title_is_rejected_then_repaired() -> None:
    llm = ScriptedLLM([plan_with(5, 0, title="Radiohead Mood"), plan_json(5)])

    await plan(llm)

    assert "prompts.0.title" in llm.last_message_text(1)


async def test_artist_reference_in_the_repair_too_fails() -> None:
    offending = plan_with(5, 1, prompt="Sounds like a lullaby by Adele")
    llm = ScriptedLLM([offending, offending])

    with pytest.raises(LLMResponseError):
        await plan(llm)


async def test_wrong_count_is_repaired_on_retry() -> None:
    llm = ScriptedLLM([plan_json(4), plan_json(5)])

    result = await plan(llm)

    assert len(result.prompts) == 5
    assert len(llm.calls) == 2


async def test_length_outside_the_elevenlabs_range_is_repaired() -> None:
    llm = ScriptedLLM([plan_with(5, 0, length_ms=2_999), plan_json(5)])

    await plan(llm)

    assert "prompts.0.length_ms" in llm.last_message_text(1)


async def test_instrumental_defaults_to_true_when_the_model_omits_it() -> None:
    payload = json.loads(plan_json(5))
    for item in payload["prompts"]:
        del item["instrumental"]
    llm = ScriptedLLM([json.dumps(payload)])

    result = await plan(llm)

    assert all(item.instrumental for item in result.prompts)
