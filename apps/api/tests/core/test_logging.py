import io
import logging
from collections.abc import Iterator

import pytest
from pydantic import SecretStr

from app.core.logging import MASK, RedactionFilter, redaction_filter, setup_logging


@pytest.fixture
def stream_logger() -> Iterator[tuple[logging.Logger, io.StringIO, RedactionFilter]]:
    """A logger whose handler carries a fresh filter, like the real root handler does."""
    stream = io.StringIO()
    handler = logging.StreamHandler(stream)
    handler.setFormatter(logging.Formatter("%(message)s"))
    secret_filter = RedactionFilter()
    handler.addFilter(secret_filter)
    logger = logging.getLogger("tests.redaction")
    logger.setLevel(logging.DEBUG)
    logger.propagate = False
    logger.addHandler(handler)
    yield logger, stream, secret_filter
    logger.removeHandler(handler)


def test_masks_a_secretstr_value_in_the_message(
    stream_logger: tuple[logging.Logger, io.StringIO, RedactionFilter],
) -> None:
    logger, stream, secret_filter = stream_logger
    secret_filter.register(SecretStr("hunter2-hunter2"))

    logger.info("connecting with hunter2-hunter2 now")

    assert stream.getvalue().strip() == f"connecting with {MASK} now"


def test_masks_a_plain_string_secret_in_the_args(
    stream_logger: tuple[logging.Logger, io.StringIO, RedactionFilter],
) -> None:
    logger, stream, secret_filter = stream_logger
    secret_filter.register("sk-live-abcdef")

    logger.warning("key=%s user=%s", "sk-live-abcdef", "bob")

    assert stream.getvalue().strip() == f"key={MASK} user=bob"


def test_masks_secrets_in_tracebacks(
    stream_logger: tuple[logging.Logger, io.StringIO, RedactionFilter],
) -> None:
    logger, stream, secret_filter = stream_logger
    secret_filter.register("token-12345")

    try:
        raise ValueError("bad token token-12345")
    except ValueError:
        logger.exception("failed")

    output = stream.getvalue()
    assert "token-12345" not in output
    assert f"bad token {MASK}" in output


def test_masks_every_occurrence_and_longest_secret_first(
    stream_logger: tuple[logging.Logger, io.StringIO, RedactionFilter],
) -> None:
    logger, stream, secret_filter = stream_logger
    secret_filter.register("abc", "abcdef")

    logger.info("abcdef and abc and abcdef")

    assert stream.getvalue().strip() == f"{MASK} and {MASK} and {MASK}"


def test_empty_secret_is_ignored(
    stream_logger: tuple[logging.Logger, io.StringIO, RedactionFilter],
) -> None:
    logger, stream, secret_filter = stream_logger
    secret_filter.register("", SecretStr(""))

    logger.info("hello")

    assert stream.getvalue().strip() == "hello"


def test_records_without_secrets_pass_through_unchanged(
    stream_logger: tuple[logging.Logger, io.StringIO, RedactionFilter],
) -> None:
    logger, stream, _ = stream_logger

    logger.info("%d items for %s", 3, "alice")

    assert stream.getvalue().strip() == "3 items for alice"


def test_setup_logging_installs_the_filter_once() -> None:
    setup_logging()
    setup_logging()

    handlers = [h for h in logging.getLogger().handlers if redaction_filter in h.filters]
    assert len(handlers) == 1
