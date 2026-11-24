"""Settings for the demo, read from apps/demo/.env.

Demo-only shortcut: the real app configures providers and keys in the web admin. Variables that are
already set in the environment (for example by Docker Compose) win over the file.
"""

import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import HTTPException

ENV_FILE = Path(__file__).resolve().parent.parent / ".env"

load_dotenv(ENV_FILE)


def require(name: str) -> str:
    """Return a setting, or answer HTTP 503 naming the missing variable. Never log the value."""
    value = os.environ.get(name, "").strip()
    if not value:
        raise HTTPException(status_code=503, detail=f"{name} is not set; add it to apps/demo/.env")
    return value
