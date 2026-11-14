# apps/api

FastAPI service with the AI parts of the product: it turns an image into a mood (three axes in
`[-1, 1]`, a short summary and tags) with an OpenAI-compatible LLM, plans 5 to 25 distinct song
prompts for that mood with the same LLM, and generates one MP3 from a prompt with ElevenLabs Music.
The API holds no state: there is no database, worker, storage or login yet. Layout and rules are in
[AGENTS.md](AGENTS.md).

## Endpoints

Interactive docs are served at `/docs` while the app runs. Errors come back as
`{"error": {"code": "...", "message": "..."}}`.

### `GET /healthz`

```bash
curl http://localhost:8000/healthz
# {"status":"ok"}
```

### `POST /mood/analysis`

Multipart upload of one JPEG, PNG or WEBP image (up to 10 MB). Returns `vector`
(`valence`, `texture`, `energy`), `summary` and `tags`.

```bash
curl -X POST http://localhost:8000/mood/analysis -F "image=@photo.jpg"
```

### `POST /music/prompts`

JSON with `mood`, `summary`, `tags` and an optional `count` (5 to 25, default 5). Returns
`prompts`: a list of `{title, prompt, length_ms, instrumental}` with distinct titles and prompts.

```bash
curl -X POST http://localhost:8000/music/prompts \
  -H "Content-Type: application/json" \
  -d '{"mood": {"valence": 0.5, "texture": -0.6, "energy": -0.3},
       "summary": "A quiet, sunny morning in a wooden kitchen.",
       "tags": ["calm", "warm"],
       "count": 5}'
```

### `POST /music/generate`

JSON with `prompt`, `length_ms` (3000 to 600000) and an optional `instrumental` (default `true`).
Returns the MP3 file (`audio/mpeg`).

```bash
curl -X POST http://localhost:8000/music/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Warm acoustic guitar and soft brushed drums, slow tempo", "length_ms": 30000}' \
  --output track.mp3
```

## Configuration

Settings are read from environment variables for now. A missing required variable makes the
endpoints that need it answer HTTP 503 with the code `setup_required`.

| Variable | Required | Meaning |
| --- | --- | --- |
| `LLM_BASE_URL` | yes | Base URL of the OpenAI-compatible endpoint, e.g. `https://llm.example.com/v1` |
| `LLM_API_KEY` | yes | API key for that endpoint |
| `LLM_MODEL` | yes | Model name sent with every request; for `/mood/analysis` it must accept images |
| `LLM_JSON_MODE` | no | `json_schema` (default) or `json_object` for endpoints without structured outputs |
| `LLM_REASONING_EFFORT` | no | Passed through as `reasoning_effort` when set |
| `LLM_EXTRA_BODY` | no | JSON object merged into every request; it cannot set `model`, `messages` or `response_format` |
| `ELEVENLABS_API_KEY` | yes | ElevenLabs API key (used by `/music/generate`) |
| `ELEVENLABS_MODEL_ID` | yes | ElevenLabs Music model id |
| `ELEVENLABS_OUTPUT_FORMAT` | no | Audio format; blank means the API default |

Never commit real keys. Set them in your shell or a git-ignored file you load yourself.

```bash
export LLM_BASE_URL="https://llm.example.com/v1"
export LLM_API_KEY="<your-llm-key>"
export LLM_MODEL="<model-name>"
export ELEVENLABS_API_KEY="<your-elevenlabs-key>"
export ELEVENLABS_MODEL_ID="<music-model-id>"
```

## Run locally

Needs Python 3.13 or newer and [uv](https://docs.astral.sh/uv/). From `apps/api`:

```bash
uv sync
uv run uvicorn app.main:app --reload
```

The server listens on `http://127.0.0.1:8000`. No `PYTHONPATH` is needed: `uv sync` installs the
`app` package from `src/app` into the project's virtual environment.

## Tests and checks

```bash
uv run pytest          # unit tests with fake clients; no keys needed
uv run ruff check .    # lint
uv run pyright         # types
```

Tests marked `live` call the real LLM and ElevenLabs. They are excluded by default and need the
variables above. Run them on purpose with `uv run pytest -m live`; they are skipped when a
variable is missing.

## Not built yet

Database, settings store edited in the web app, background worker, object storage, playlists,
streaming, login and admin, and a Docker image for the API. These were dropped from the current
scope; [AGENTS.md](AGENTS.md) keeps them as the long-term direction.
