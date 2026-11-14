"""Logging setup with a redaction filter that masks secrets in every record."""

import logging
from collections.abc import Iterable

from pydantic import SecretStr

MASK = "[REDACTED]"


class RedactionFilter(logging.Filter):
    """Replace registered secret values with ``[REDACTED]`` in message, args and tracebacks."""

    def __init__(self) -> None:
        super().__init__()
        self._secrets: set[str] = set()

    def register(self, *values: SecretStr | str) -> None:
        """Add secrets to mask. Empty values are ignored: masking "" would corrupt every line."""
        for value in values:
            raw = value.get_secret_value() if isinstance(value, SecretStr) else value
            if raw:
                self._secrets.add(raw)

    def mask(self, text: str) -> str:
        # Longest first, so a secret that contains another one is masked as a whole.
        for secret in sorted(self._secrets, key=len, reverse=True):
            text = text.replace(secret, MASK)
        return text

    def filter(self, record: logging.LogRecord) -> bool:
        record.msg = self.mask(record.getMessage())
        record.args = None
        if record.exc_info and not record.exc_text:
            record.exc_text = logging.Formatter().formatException(record.exc_info)
        if record.exc_text:
            record.exc_text = self.mask(record.exc_text)
        if record.stack_info:
            record.stack_info = self.mask(record.stack_info)
        return True


redaction_filter = RedactionFilter()


def register_secrets(secrets: Iterable[SecretStr | str]) -> None:
    """Make the global filter mask these values from now on."""
    redaction_filter.register(*secrets)


def setup_logging(level: int | str = logging.INFO) -> None:
    """Configure the root logger once; the filter sits on the handler so it sees every record."""
    root = logging.getLogger()
    root.setLevel(level)
    if any(redaction_filter in handler.filters for handler in root.handlers):
        return
    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(name)s: %(message)s"))
    handler.addFilter(redaction_filter)
    root.addHandler(handler)
