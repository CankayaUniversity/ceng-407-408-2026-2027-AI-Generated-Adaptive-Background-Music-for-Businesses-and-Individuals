"""Retry numbers of track generation."""

# ElevenLabs answers 429 when too many requests are running; this many tries in all.
MAX_RATE_LIMIT_ATTEMPTS = 3
# Wait before the next try when the answer carries no Retry-After: 1 s, then 2 s.
BACKOFF_START_SECONDS = 1.0
BACKOFF_FACTOR = 2.0
# A longer Retry-After is capped so one request cannot hold a connection open for minutes.
MAX_WAIT_SECONDS = 60.0
