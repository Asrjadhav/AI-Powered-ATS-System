"""
Central logging for the backend.

setup_logging() is called once at startup (main.py). Every module then just does
`logger = logging.getLogger(__name__)`.

Output (console, plus an optional rotating file):

    2026-10-14 11:02:31,204 INFO    a1b2c3d4 services.application_service | Application created: ...

The 8-character id is the request id: every line written while handling one HTTP
request carries the same id, so a whole flow (request -> service steps -> email ->
response) can be followed by searching for it. The id is also returned to the client
in the X-Request-ID response header (and a client-supplied X-Request-ID is reused).

Settings (config.py / environment): LOG_LEVEL (default INFO), LOG_FILE (optional).

What is never logged: request/response bodies, passwords, tokens, API keys, email
bodies. Email addresses are masked with mask_email().
"""

import logging
import os
import time
import uuid
from contextvars import ContextVar
from logging.handlers import RotatingFileHandler
from typing import Optional
from urllib.parse import parse_qs

import config

request_id_var: ContextVar[str] = ContextVar("request_id", default="-")

LOG_FORMAT = "%(asctime)s %(levelname)-7s %(request_id)s %(name)s | %(message)s"

# Paths that are polled or are browser preflights: logged at DEBUG so they don't bury real activity.
QUIET_PATHS = ("/health", "/healthz", "/api/health")

logger = logging.getLogger(__name__)


class RequestIdFilter(logging.Filter):
    """Stamps every log record with the id of the request being handled ("-" outside a request)."""

    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = request_id_var.get()
        return True


def mask_email(value: Optional[str]) -> str:
    """priya.nair@example.com -> p***@example.com (enough to recognise, not to harvest)."""
    if not value or "@" not in str(value):
        return str(value or "-")
    local, _, domain = str(value).partition("@")
    return f"{local[:1]}***@{domain}"


def setup_logging() -> None:
    """Configures the root logger. Safe to call more than once (it replaces its own handlers)."""
    level_name = (config.LOG_LEVEL or "INFO").upper()
    level = getattr(logging, level_name, logging.INFO)

    root = logging.getLogger()
    root.setLevel(level)
    for handler in list(root.handlers):
        if getattr(handler, "_ats_handler", False):
            root.removeHandler(handler)

    formatter = logging.Formatter(LOG_FORMAT)
    request_filter = RequestIdFilter()

    console = logging.StreamHandler()
    console.setFormatter(formatter)
    console.addFilter(request_filter)
    console._ats_handler = True
    root.addHandler(console)

    file_error = None
    if config.LOG_FILE:
        try:
            os.makedirs(os.path.dirname(os.path.abspath(config.LOG_FILE)), exist_ok=True)
            file_handler = RotatingFileHandler(
                config.LOG_FILE, maxBytes=5 * 1024 * 1024, backupCount=3, encoding="utf-8"
            )
            file_handler.setFormatter(formatter)
            file_handler.addFilter(request_filter)
            file_handler._ats_handler = True
            root.addHandler(file_handler)
        except OSError as exc:
            file_error = exc  # logging must never stop the app from starting; reported below

    # Our middleware logs each request, so uvicorn's own access log would just duplicate it.
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    # Chatty libraries: only their warnings and errors.
    for noisy in ("urllib3", "google", "httpx", "httpcore", "multipart", "watchfiles", "sqlalchemy.engine"):
        logging.getLogger(noisy).setLevel(logging.WARNING)

    logger.info("Logging started (level=%s, file=%s)", level_name, config.LOG_FILE or "none")
    if file_error:
        logger.error("Could not open LOG_FILE %r (%s), logging to the console only", config.LOG_FILE, file_error)


class RequestLoggingMiddleware:
    """
    Logs every HTTP request: `-> METHOD /path [query=names]` on arrival and
    `<- METHOD /path STATUS in N ms` when the response starts. 5xx are logged as
    errors, 4xx as warnings, an unhandled exception with its traceback.
    Only the query parameter NAMES are logged (values can hold personal data).
    """

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        headers = dict(scope.get("headers") or [])
        request_id = (headers.get(b"x-request-id") or b"").decode("latin-1")[:32] or uuid.uuid4().hex[:8]
        token = request_id_var.set(request_id)

        method = scope["method"]
        path = scope["path"]
        quiet = method == "OPTIONS" or path in QUIET_PATHS
        query_names = sorted(parse_qs(scope.get("query_string", b"").decode("latin-1")).keys())
        query_text = f" query={','.join(query_names)}" if query_names else ""

        started = time.perf_counter()
        response = {"status": None}

        async def send_with_request_id(message):
            if message["type"] == "http.response.start":
                response["status"] = message["status"]
                message["headers"] = list(message.get("headers", [])) + [(b"x-request-id", request_id.encode("latin-1"))]
            await send(message)

        logger.log(logging.DEBUG if quiet else logging.INFO, "-> %s %s%s", method, path, query_text)
        try:
            await self.app(scope, receive, send_with_request_id)
        except Exception:
            elapsed = (time.perf_counter() - started) * 1000
            logger.exception("!! %s %s crashed with an unhandled error after %.0f ms", method, path, elapsed)
            raise
        else:
            elapsed = (time.perf_counter() - started) * 1000
            status = response["status"] or 0
            if status >= 500:
                level = logging.ERROR
            elif status >= 400:
                level = logging.WARNING
            else:
                level = logging.DEBUG if quiet else logging.INFO
            logger.log(level, "<- %s %s %s in %.0f ms", method, path, status, elapsed)
        finally:
            request_id_var.reset(token)
