# apps/api: agent guide

FastAPI service and background worker. Read the root [AGENTS.md](../../AGENTS.md) first.

Status: **planned, no code yet.** This file describes what the backend is meant to achieve and a proposed starting shape. It is a direction, not a final plan: adjust it when building shows a better way, and update this file when a choice is settled.

## Goals

- **Easy to find things.** Code is grouped by product feature, so everything about playlists, for example, lives in one place.
- **Swappable providers.** Changing the LLM, the music service or the object store is a settings change for the admin, not a code change.
- **Configured from the web.** An admin sets providers, models, keys, limits and plans in the web app. No `.env` file and no shell access needed after first deploy.
- **Secure by default.** Secrets are encrypted at rest, never shown back, never logged, and admin actions are audited.
- **Testable.** External services can be replaced with fakes, and database tests run against the same Postgres as production.

## Proposed layout

The starting shape follows the package-per-feature style of [Netflix Dispatch](https://github.com/Netflix/dispatch) and [fastapi-best-practices](https://github.com/zhanymkanov/fastapi-best-practices). Features are grouped into areas (`mood/`, `music/`, `accounts/`, `admin/`). Shared pieces live in `core/`, as in FastAPI's [full-stack template](https://github.com/fastapi/full-stack-fastapi-template), and external services in `clients/`.

```text
apps/api/
├── pyproject.toml, uv.lock
├── Dockerfile                   # one image; the command picks the API or the worker
├── alembic.ini, alembic/        # migrations (if SQLAlchemy is chosen)
├── src/app/
│   ├── main.py                  # creates the FastAPI app, includes the area routers
│   ├── worker.py                # background worker entry point
│   ├── core/                    # used everywhere, owns no feature
│   │   ├── config.py            #   bootstrap: DB connection + encryption keys
│   │   ├── crypto.py            #   encrypt/decrypt stored secrets, key rotation
│   │   ├── database.py, models.py, schemas.py
│   │   ├── exceptions.py        #   base errors and their HTTP mapping
│   │   ├── security.py          #   password hashing, token helpers
│   │   └── logging.py           #   includes secret redaction
│   ├── accounts/                # auth/ (login, current user), users/ (profiles, plans)
│   ├── mood/
│   │   ├── vector.py            #   MoodVector: valence, texture, energy in [-1, 1]
│   │   ├── analysis/            #   image or snapshot -> mood vector, summary, tags
│   │   └── sessions/            #   adaptive webcam sessions: snapshots, drift, cooldown
│   ├── music/
│   │   ├── library/             #   the user's tracks, "closest 3" mood search
│   │   ├── prompting/           #   mood -> 5..25 varied song prompts via the LLM
│   │   ├── generation/          #   ElevenLabs jobs: queue, batch, retry, store MP3s
│   │   ├── playlists/
│   │   └── streaming/           #   playback URLs, range requests
│   ├── admin/
│   │   ├── settings/            #   all settings and secrets, edited on the web
│   │   ├── setup/               #   first-run wizard
│   │   └── audit/               #   who changed what, when, from where
│   └── clients/                 # external services, no business logic
│       ├── llm/                 #   OpenAI-compatible endpoint
│       ├── elevenlabs/          #   ElevenLabs Music
│       └── storage/             #   SeaweedFS (S3)
└── tests/                       # mirrors src/app
```

Each area has a `router.py` that mounts its features under `/mood`, `/music`, `/accounts` or `/admin`. A feature package uses whichever of these files it needs:

| File | Holds |
| --- | --- |
| `router.py` | thin endpoints: validate, call the service, return a schema |
| `schemas.py` | Pydantic request and response models |
| `models.py` | database tables |
| `service.py` | business logic and this feature's queries |
| `dependencies.py` | FastAPI dependencies (load and authorise a resource, parse filters) |
| `tasks.py` | background and periodic jobs |
| `exceptions.py`, `constants.py` | feature errors, enums and fixed values |
| `config.py` | the feature's admin-editable settings section |
| `prompts/` | LLM prompt templates as Markdown files, changed through PRs like code |

Client packages have `client.py`, `schemas.py`, `config.py` and `exceptions.py`.

## Design principles

These keep the code easy to change. Break one only with a reason worth writing down.

- **Logic sits in services.** Routers and tasks stay thin and call a service, so the same logic serves HTTP, the worker and tests.
- **Features own their data.** A feature that needs another feature's data asks that feature's service instead of querying its tables, e.g. the mood-distance SQL stays in `music/library/`. Import other features by module (`from app.mood.analysis import service as analysis_service`).
- **Dependencies point one way.** `mood/sessions` triggers `music`; `music` uses only `mood/vector.py` from `mood`. This avoids import cycles.
- **Providers stay behind clients.** Business code talks to `clients/`, never to an SDK directly, and avoids provider-only features so a switch stays an admin change.
- **Tests mirror the source.** Unit tests replace `clients/` with fakes through `dependency_overrides`; database tests use the Postgres 18 from `compose.yaml`.

## Configuration

Every setting and secret is edited by an admin in the web app and stored in Postgres, with secrets encrypted. Only two **secrets** come from outside, as Docker secret files in `/run/secrets/` in every environment: `postgres_password` and `app_encryption_keys`. The non-secret database host, port, user and name are plain `environment:` entries in `compose.yaml`. Locally, `infra/init-secrets.sh` creates the secret files in the git-ignored `secrets/` folder, plus `seaweedfs_s3_config.json` for SeaweedFS; the admin copies the S3 keys from that file into the web app during setup.

How it is meant to work:

- **Each feature defines its own section** as a Pydantic model in its `config.py`, for example `GenerationConfig` or `LLMConfig`. Field titles, descriptions and limits become the admin form, which the web app builds from the section's JSON Schema. Secret fields are `SecretStr`.
- **Storage.** `app_settings` keeps one versioned row per section, with `app_settings_history` for restores. `app_secrets` keeps one row per secret field with its ciphertext and the fingerprint of the key that encrypted it.
- **Editing.** Saves are validated by the owning model and use optimistic locking on `version`. A test action runs a small real request (LLM, ElevenLabs, storage) with the entered values before saving.
- **Reading.** Features read their section through the settings service, which caches values in-process. A save sends a Postgres `NOTIFY` and the API and worker reload that section. Because notifications sent while a listener is disconnected are lost, a process reloads all sections after it reconnects.
- **Restart-only fields** such as the DB pool size and worker concurrency are marked on the admin page. The first pool always starts from the built-in default, because the app must connect before it can read the stored value.
- **Defaults.** Technical fields (timeouts, pool sizes) have sensible defaults; product fields use the spec's values (5 songs, range 5–25). Provider choices and secrets have none: until the admin sets them, the features that need them report "setup required" and the admin page lists what is missing.

### Security goals

- **Secrets are write-only.** The API shows only `{"is_set": true, "hint": "…a1b2", "updated_at": …}`. Saving a form without touching a secret keeps it; clearing one is an explicit action. Stored secrets are never sent back to the browser, and connection tests run server-side.
- **Encryption.** `MultiFernet` with a comma-separated key list: the first key encrypts, all keys decrypt, and `app rotate-keys` re-encrypts with the newest. Fernet cannot bind a ciphertext to its row, so someone with database write access could move one secret into another field. Either accept that and say so, or switch to AES-GCM with `section.field` as associated data.
- **No leaks.** `SecretStr` values stay out of logs, errors, traces and responses, with a logging redaction filter as a backstop. Backups hold only ciphertext; `app_encryption_keys` is backed up separately, and losing it means re-entering every secret.
- **Admin accounts** need the `admin` role and TOTP. Changing a secret or a user's role needs a re-authentication within the last 10 minutes.
- **Audit.** Every settings change records the user, time, IP, section and changed field names, and only "changed" for secrets.
- **Transport and abuse.** HTTPS outside local development. Login, TOTP and admin routes are rate-limited. Admin sessions use `HttpOnly`, `Secure`, `SameSite=Strict` cookies with CSRF protection; see the open questions for regular users.
- **Connection tests and SSRF.** The test action makes the server call an admin-supplied URL, so it could be used to probe internal addresses. Decide whether private ranges are blocked or knowingly allowed (a self-hosted LLM is a valid reason).

### First run

With no admin yet, the API starts in setup mode and prints a one-time setup token to the server log. The token is valid for one hour, single-use, compared in constant time and invalidated once the first admin exists; rotate it if logs go to a shared aggregator. The web app's `/setup` page takes the token, creates the first admin with TOTP enrolment, then walks through the LLM, ElevenLabs and storage sections. `app create-admin` does the same from a shell.

## LLM and music providers

The code never picks a provider or model; the admin does.

- **One LLM interface.** All LLM calls go through `clients/llm/` using the OpenAI Chat Completions API. The `llm` section holds `base_url`, `api_key` and a default `model`; each task (`mood.analysis`, `mood.sessions`, `music.prompting`) can override the model.
- **Capabilities are settings, not code branches**, set globally or per task:
  - `json_mode`: `json_schema`, or `json_object` for endpoints such as DeepSeek that lack schemas. In `json_object` mode the client puts the schema and the word "JSON" in the prompt.
  - `reasoning_effort`: passed through when set.
  - `extra_body`: JSON merged into the request, e.g. `{"thinking": {"type": "disabled"}}`. It cannot override fields the client sets itself (`model`, `messages`, `response_format`).
- **Validation.** Each response is checked against the task's Pydantic schema, with one repair retry before failing.
- **Images** go as OpenAI `image_url` parts with base64 data URLs; the connection test checks that the chosen mood model accepts images.
- **Music.** The `elevenlabs` section holds `api_key`, `model_id` (required) and an optional `output_format` (blank means the API default).

## Open questions

- **Background jobs:** a Postgres-based queue (e.g. Procrastinate, no extra service) or ARQ with Redis.
- **Database access:** SQLAlchemy with Alembic, as in both reference projects, or plain SQL with a small migration runner.
- **User login:** session cookies (as already chosen for admins) or tokens for regular users, and whether to support an external identity provider.
- **Secret binding:** keep Fernet, or move to AES-GCM with associated data (see Security goals).
