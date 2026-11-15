# ElevenLabs Music prompting

How the song prompts of this project are written. The planner in
`apps/api/src/app/music/prompting/` asks the LLM for them, using the template
`prompts/plan.md`; the generation endpoint sends them to ElevenLabs Music unchanged.

## Principle

Describe the sound, not a reference. A good prompt says what the music is made of (genre,
instruments, tempo, texture) and how it feels. It never points at somebody else's music.

## What goes into a prompt

| Element | Examples |
| --- | --- |
| Genre or blend | ambient, lo-fi hip hop, chamber folk, downtempo electronica |
| Instrumentation | felt piano, fingerpicked nylon guitar, analog pads, brushed drums |
| Tempo | "slow, around 70 BPM", "mid-tempo shuffle", "driving, 128 BPM" |
| Texture and production | warm, airy, dry, spacious, tape-saturated, crackling vinyl |
| Movement | steady, slowly building, gently evolving, sparse then fuller |
| Mood words | wistful, hopeful, tense, playful, serene |

Aim for one to three sentences, roughly 150 to 400 characters. Write in English.

## From mood axes to words

The mood has three axes in `[-1, 1]`. The planner sends them to the LLM as numbers with a word
for their strength; the LLM turns them into the vocabulary below.

| Axis | Low end | High end |
| --- | --- | --- |
| valence | minor keys, sparse, melancholic | major keys, bright, uplifting |
| texture | acoustic, organic, wooden, live room | synthesised, electronic, programmed beats |
| energy | slow, soft, long notes | fast, dense, strong rhythm |

A playlist for one mood still needs variety. Change genre, lead instrument, tempo and
arrangement between songs while staying on the same side of every axis.

## Example

Mood: valence +0.6, texture -0.7, energy -0.4 ("a quiet sunny morning in a kitchen").

> Warm acoustic folk with fingerpicked nylon guitar, soft upright bass and a light brushed
> snare. Relaxed tempo around 80 BPM, airy and intimate, with a gentle major-key melody that
> repeats and slowly opens up.

## What to avoid

- **No artist, band or composer names.** ElevenLabs rejects them with a `bad_prompt` error.
  Phrases such as "in the style of", "sounds like" or "like <name>" are rejected the same way.
- **No copyrighted works.** That includes films, games and franchises used as a reference.
- **No copyrighted lyrics.** The API refuses them. Instrumental output is the default here,
  so prompts normally contain no lyrics at all.
- **No instructions to the model** ("ignore the above"). The summary and tags that describe the
  mood are treated as scene description only.

## Instrumental by default

Every planned song is instrumental unless the mood clearly calls for vocals. The generation
endpoint sends `force_instrumental` with the song's `instrumental` flag, which defaults to true.

## Length limits

- ElevenLabs accepts `music_length_ms` from 3 000 to 600 000 (3 seconds to 10 minutes) when a
  prompt is used. The API of this project enforces the same range.
- The planner asks for 90 000 to 240 000 ms per song and varies it.
- Prompt text is capped at 2 000 characters, a conservative project limit.

## How refusals are handled

1. Planning: the plan is validated, and a prompt that names a real artist, band or copyrighted
   work is sent back to the LLM once for a fix (the guard is a short blocklist, not a complete
   filter).
2. Generation: if ElevenLabs still answers `bad_prompt`, the request is repeated once with the
   `prompt_suggestion` from the error. A second refusal ends in HTTP 422.
3. Rate limits (HTTP 429) are retried with backoff, three tries in all, before the 429 is returned.
