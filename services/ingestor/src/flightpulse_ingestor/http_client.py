"""Shared HTTP client for source discovery and CSV download.

Uses plain HTTP requests (httpx) rather than browser automation — CAA
publication pages are static server-rendered HTML, so JavaScript rendering
is not required (see docs/ingestion.md#discovery).
"""

from __future__ import annotations

import hashlib
from dataclasses import dataclass

import httpx
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

from flightpulse_ingestor.config import IngestorSettings


@dataclass(frozen=True)
class DownloadedFile:
    url: str
    content: bytes
    content_type: str | None
    etag: str | None
    last_modified: str | None
    checksum_sha256: str

    @property
    def size_bytes(self) -> int:
        return len(self.content)

    @property
    def looks_like_html(self) -> bool:
        """Guards against a broken link silently returning an HTML error page
        instead of a CSV (see section 82 suspicious-change detection)."""
        head = self.content[:512].lstrip().lower()
        return head.startswith(b"<!doctype html") or head.startswith(b"<html")


def build_client(settings: IngestorSettings) -> httpx.Client:
    return httpx.Client(
        timeout=settings.request_timeout_seconds,
        headers={"User-Agent": settings.user_agent},
        follow_redirects=True,
    )


@retry(
    reraise=True,
    stop=stop_after_attempt(4),
    wait=wait_exponential(multiplier=1, min=1, max=20),
    retry=retry_if_exception_type((httpx.TransportError, httpx.HTTPStatusError)),
)
def fetch_text(client: httpx.Client, url: str) -> str:
    response = client.get(url)
    response.raise_for_status()
    return response.text


@retry(
    reraise=True,
    stop=stop_after_attempt(4),
    wait=wait_exponential(multiplier=1, min=1, max=20),
    retry=retry_if_exception_type((httpx.TransportError, httpx.HTTPStatusError)),
)
def download_file(client: httpx.Client, url: str) -> DownloadedFile:
    with client.stream("GET", url) as response:
        response.raise_for_status()
        digest = hashlib.sha256()
        chunks: list[bytes] = []
        for chunk in response.iter_bytes():
            digest.update(chunk)
            chunks.append(chunk)
        content = b"".join(chunks)

    return DownloadedFile(
        url=url,
        content=content,
        content_type=response.headers.get("content-type"),
        etag=response.headers.get("etag"),
        last_modified=response.headers.get("last-modified"),
        checksum_sha256=digest.hexdigest(),
    )
