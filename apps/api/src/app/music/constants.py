"""Limits of the music provider that more than one music feature relies on."""

# ElevenLabs Music accepts 3 000 to 600 000 ms when a prompt is given (3 s to 10 minutes).
MIN_LENGTH_MS = 3_000
MAX_LENGTH_MS = 600_000

# The reference states no prompt limit; this is a conservative cap that also bounds request size.
MAX_PROMPT_CHARS = 2_000
