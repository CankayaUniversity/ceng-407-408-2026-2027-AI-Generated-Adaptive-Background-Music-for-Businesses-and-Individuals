# apps/demo: agent guide

Read the root [AGENTS.md](../../AGENTS.md) first. This app is a throwaway, one-page demo of the
whole pipeline (Figure 1): **venue photo → mood analysis → prompt planning → music generation →
playback**. It lives on the `demo` branch and does not depend on `apps/web` or `apps/api`.

The work is split into numbered steps. Pick the next open step, build only that step, keep the
contracts below, tick it off in the table, and commit it on its own.

## Status

| Step | What | State |
| --- | --- | --- |
| 1 | Capture a webcam frame and send it to the server | done |
| 2 | Mood analysis with an OpenAI-compatible LLM | done |
| 3 | Prompt planning (5 song prompts) | done |
| 4 | Generate one track with ElevenLabs, keep the last 5 | open |
| 5 | Bottom music player | open |
| 6 | Auto-adapt loop | later |

## Rules

- **One page.** Everything the user sees is `demo/static/index.html`: plain HTML, CSS and JS in
  one file. No Next.js, no npm, no build step, no CSS framework.
- **Small backend.** FastAPI in `demo/`. One module per concern (`llm.py`, `elevenlabs.py`,
  `store.py`, …); endpoints in `demo/main.py`.
- **Config lives in `apps/demo/.env`** (git-ignored; template in `.env.example`). Read it with
  `config.require("NAME")`, which answers HTTP 503 naming the missing variable. This is a
  demo-only shortcut; the real app configures everything in the web admin. There are no default
  models: whoever runs the demo picks them. Never log, return or commit a key.
- **Errors** are FastAPI's default `{"detail": "..."}`; the page shows `detail` in red.
- **Song prompts** follow the ElevenLabs Music guidance in `.claude/skills/music/` (genre,
  instrumentation, tempo, mood, texture). Never name a real artist, band or song.
- **Generated audio and data stay out of git** (`apps/demo/data/`, `*.mp3`).
- Before committing: `uv run ruff check . && uv run ruff format --check .`, run the server and try
  the step in a browser.

## Layout

```text
apps/demo/
├── AGENTS.md, README.md
├── pyproject.toml, uv.lock, .python-version
├── .env.example          # copy to .env
├── Dockerfile, compose.yaml, .dockerignore
├── demo/
│   ├── main.py           # FastAPI app and endpoints
│   ├── config.py         # .env loading, require()
│   ├── images.py         # read_image(): JPEG/PNG/WEBP check, 10 MB limit
│   ├── llm.py            # step 2
│   ├── prompts/          # step 2-3: mood.md, plan.md (LLM system prompts)
│   ├── elevenlabs.py     # step 4
│   ├── store.py          # step 4
│   └── static/index.html
└── data/                 # step 4, git-ignored: tracks/<id>.mp3 + tracks.json
```

## Steps

### 1. Capture (done)

- `GET /` serves the page. The page starts the camera with `getUserMedia` (works on
  `http://localhost` or HTTPS only), **Capture** draws the frame to a canvas and makes a JPEG blob,
  shows it as "Last snapshot" and posts it.
- `POST /api/snapshot`, multipart field `image` → `{"size_bytes": int, "media_type": str}`.
  `images.read_image()` rejects non-images (400) and files over 10 MB (413).
- In the page, the capture handler has a `// Step 2 continues the pipeline here` comment: that is
  where the pipeline continues with the same blob.

### 2. Mood analysis

- New `.env`: `LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL` (the model must accept images).
- Add `openai` with `uv add openai`. `llm.py`: `AsyncOpenAI(base_url=…, api_key=…)`, Chat
  Completions, `response_format={"type": "json_object"}`, and the Pydantic model's JSON schema in
  the system prompt (works on most OpenAI-compatible endpoints). Strip a ```` ```json ```` fence
  before validating. If validation fails, send the errors back once and ask again.
- `POST /api/mood`, multipart `image` (reuse `read_image`) → the image goes in as a
  `data:<media_type>;base64,…` URL →

  ```json
  {"valence": 0.4, "texture": -0.6, "energy": -0.2,
   "summary": "A quiet café with warm light.", "tags": ["calm", "warm", "cozy"]}
  ```

  Each axis is in `[-1, 1]`: valence sad→happy, texture acoustic→electronic, energy calm→energetic.
  The system prompt is `demo/prompts/mood.md`.
- Page: call it after the snapshot (it can replace `/api/snapshot`); show three bars with labels at
  both ends, the summary and the tags.
- Done when a captured frame shows a plausible mood within a few seconds, and a missing variable
  shows the 503 message on the page.

### 3. Prompt planning

- `POST /api/plan`, JSON body = the step 2 result → exactly 5 prompts:

  ```json
  {"prompts": [{"title": "Morning Steam", "prompt": "Warm acoustic guitar, soft brushed drums, 80 BPM, …",
                "length_ms": 90000, "instrumental": true}]}
  ```

  The LLM picks `length_ms` within 3 000 to 600 000 (ElevenLabs' range). Titles and prompts must be
  distinct. The system prompt `demo/prompts/plan.md` is written from `.claude/skills/music/`.
- Page: list the 5 titles with their prompt text and length.
- Done when one capture gives 5 different, mood-fitting prompts.

### 4. Generation and the last 5 songs

- New `.env`: `ELEVENLABS_API_KEY`, `ELEVENLABS_MODEL_ID`. Add `httpx` with `uv add httpx`.
- `elevenlabs.py`: `POST https://api.elevenlabs.io/v1/music` with header `xi-api-key` and body
  `{prompt, music_length_ms, model_id, force_instrumental}` → MP3 bytes. Set the httpx timeout to
  600 s (long tracks take minutes; the httpx default is 5 s). If the error says `bad_prompt` and
  carries a `prompt_suggestion`, retry once with the suggestion.
- `POST /api/generate`, JSON `{title, prompt, length_ms, instrumental, summary}` → generates the
  track, saves `data/tracks/<uuid hex>.mp3`, adds `{id, title, prompt, summary, length_ms,
  created_at}` to `data/tracks.json`, deletes everything beyond the newest 5 and returns the new
  entry.
- `GET /api/tracks` → newest-first list (at most 5). `GET /tracks/{id}.mp3` → `FileResponse`;
  accept only a 32-character hex id, so no path tricks.
- Only the **first** planned prompt is generated per capture (credits).
- Docker: add `volumes: ["./data:/app/data"]` to `compose.yaml` so tracks survive restarts.
- Page: "Generating '<title>' (1:30)…" while it runs, then the "Last 5 songs" list.
- Done when a 6th generation removes the oldest file and the list shows 5.

### 5. Player

- A fixed bottom bar on a dark background, modelled on a typical streaming player: square cover
  placeholder, title and mood summary on the left; previous / play-pause / next in the middle with
  current time, seek bar and total time under them; a volume icon and slider on the right. Skip
  shuffle, repeat and the other extras.
- One `<audio>` element. Clicking a row in "Last 5 songs" plays it; previous/next walk the list;
  `ended` moves to the next track. A new track plays automatically when it is ready: call
  `audio.play()` once inside the Capture click (then pause it) so Safari allows playing later.
- Done when play/pause, seek, previous/next and volume all work on the stored tracks.

### 6. Auto-adapt (later)

A checkbox and an interval. When it is on, a timer captures, analyses and generates without asking,
which is the dashed arrow in Figure 1.

## Run

```bash
cd apps/demo
cp .env.example .env       # fill in when a step needs it
uv sync
uv run uvicorn demo.main:app --reload    # http://localhost:8000
# or: docker compose up --build
```
