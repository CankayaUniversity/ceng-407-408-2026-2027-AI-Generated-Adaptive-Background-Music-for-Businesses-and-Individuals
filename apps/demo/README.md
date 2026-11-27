# apps/demo

A one-page demo of the pipeline: webcam snapshot → mood → song prompts → ElevenLabs track →
player. It is built step by step; see [AGENTS.md](AGENTS.md) for the plan and what is done.

## Run

Needs Python 3.13+ and [uv](https://docs.astral.sh/uv/), or Docker.

```bash
cd apps/demo
cp .env.example .env    # fill in the keys the current step needs; never commit .env
uv sync
uv run uvicorn demo.main:app --reload
```

`.env` is read once when the server starts: restart it after changing a value. `--reload` only
watches the Python files.

With Docker:

```bash
cd apps/demo
cp .env.example .env
docker compose up --build
```

Open <http://localhost:8000> and allow the camera. Browsers only give camera access on
`localhost` or HTTPS, so open it on the machine that runs the server.

## Checks

```bash
uv run ruff check .
uv run ruff format --check .
```
