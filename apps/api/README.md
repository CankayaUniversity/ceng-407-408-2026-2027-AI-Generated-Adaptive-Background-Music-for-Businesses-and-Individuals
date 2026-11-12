# apps/api (planned)

FastAPI service and background worker for mood extraction, library matching, song generation with
ElevenLabs Music, playlists and adaptive webcam sessions.

Features are grouped into `mood/` (analysis, sessions), `music/` (library, prompting,
generation, playlists, streaming) and `accounts/` (auth, users). Each feature is a package with
`router.py`, `schemas.py`, `models.py` and `service.py`, in the style of Netflix Dispatch. The full
layout and rules are in [AGENTS.md](AGENTS.md).
