# AI-Generated Adaptive Background Music for Businesses and Individuals

CENG 407/408 (2026-2027) project at Çankaya University. The app turns an image or a periodic
webcam snapshot into a mood, previews matching tracks from your library, and generates a varied
playlist with ElevenLabs Music for personal streaming.

| Part | Path | Stack |
| --- | --- | --- |
| Web app | `apps/web` | Next.js 16, React 19, Astryx design system (Frost theme) |
| API + worker | `apps/api` (planned) | Python, FastAPI |
| Data | `infra/` (planned) | PostgreSQL 18, SeaweedFS |

## Quick start (web)

```bash
# Node 26 or newer (see engines in apps/web/package.json)
cd apps/web && npm install && npm run dev
```

## Quick start (services)

```bash
infra/init-secrets.sh   # once: creates Docker secret files in secrets/ (git-ignored)
docker compose up -d    # Postgres 18 + SeaweedFS
```

If ports 5432 or 8333 are taken, run with `POSTGRES_HOST_PORT=55432 S3_HOST_PORT=58333`.

Contributors and AI agents: read [AGENTS.md](AGENTS.md) first. It covers the repository layout,
the toolchain and the GitHub Flow source-control rules.
