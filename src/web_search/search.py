"""Search providers and grounded synthesis for web-search."""

from __future__ import annotations

import json
from collections.abc import Mapping
from typing import Any

import httpx
from google import genai
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

SearchResult = dict[str, str | None]
SearchPayload = dict[str, Any]

FRESHNESS_MAP = {
    "day": "pd",
    "week": "pw",
    "month": "pm",
    "year": "py",
}
MAX_RESULTS = 20


class SearchSettings(BaseSettings):
    """Environment-backed provider credentials."""

    model_config = SettingsConfigDict(
        env_file=(".env", ".env.local"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    brave_api_key: str | None = Field(default=None, alias="BRAVE_API_KEY")
    serper_api_key: str | None = Field(default=None, alias="SERPER_API_KEY")
    gemini_api_key: str | None = Field(default=None, alias="GEMINI_API_KEY")

    @property
    def has_search(self) -> bool:
        return self.brave_api_key is not None or self.serper_api_key is not None

    @property
    def has_grounding(self) -> bool:
        return self.gemini_api_key is not None


def _bounded_count(count: object) -> int:
    if not isinstance(count, int):
        return 10
    return max(1, min(count, MAX_RESULTS))


def brave_search(
    api_key: str,
    query: str,
    count: int = 10,
    freshness: str | None = None,
) -> list[SearchResult]:
    """Search via Brave Search API."""
    params: dict[str, str | int] = {"q": query, "count": _bounded_count(count)}
    if freshness in FRESHNESS_MAP:
        params["freshness"] = FRESHNESS_MAP[freshness]

    with httpx.Client(timeout=30) as client:
        response = client.get(
            "https://api.search.brave.com/res/v1/web/search",
            headers={"X-Subscription-Token": api_key, "Accept": "application/json"},
            params=params,
        )
        response.raise_for_status()
        data = response.json()

    results: list[SearchResult] = []
    for item in data.get("web", {}).get("results", []):
        results.append(
            {
                "title": item.get("title", ""),
                "url": item.get("url", ""),
                "snippet": item.get("description", ""),
                "published": item.get("age"),
            }
        )
    return results


def serper_search(api_key: str, query: str, count: int = 10) -> list[SearchResult]:
    """Search via Serper API."""
    with httpx.Client(timeout=30) as client:
        response = client.post(
            "https://google.serper.dev/search",
            headers={"X-API-KEY": api_key, "Content-Type": "application/json"},
            json={"q": query, "num": _bounded_count(count)},
        )
        response.raise_for_status()
        data = response.json()

    results: list[SearchResult] = []
    for item in data.get("organic", []):
        results.append(
            {
                "title": item.get("title", ""),
                "url": item.get("link", ""),
                "snippet": item.get("snippet", ""),
                "published": item.get("date"),
            }
        )
    return results


def gemini_grounded(query: str, api_key: str) -> SearchPayload:
    """Get a Gemini answer grounded with Google Search."""
    from google.genai.types import GoogleSearch, Tool

    client = genai.Client(api_key=api_key)
    response = client.models.generate_content(
        model="gemini-2.0-flash",
        contents=query,
        config={"tools": [Tool(google_search=GoogleSearch())]},
    )

    sources: list[dict[str, str]] = []
    try:
        if not response.candidates:
            return {"answer": response.text, "sources": sources}
        candidate = response.candidates[0]
        metadata = getattr(candidate, "grounding_metadata", None)
        chunks = getattr(metadata, "grounding_chunks", None)
        if chunks:
            for chunk in chunks:
                web = getattr(chunk, "web", None)
                if web:
                    sources.append(
                        {
                            "title": getattr(web, "title", ""),
                            "url": getattr(web, "uri", ""),
                        }
                    )
    except (AttributeError, IndexError):
        pass

    return {"answer": response.text, "sources": sources}


def web_search(
    args: Mapping[str, Any],
    settings: SearchSettings | None = None,
) -> tuple[str, bool]:
    """Run web search and return a JSON string plus an error flag."""
    resolved_settings = settings if settings is not None else SearchSettings()
    query = args.get("query")
    if not isinstance(query, str) or not query.strip():
        return "Missing required 'query' parameter", True

    mode = args.get("mode", "raw")
    count = _bounded_count(args.get("count", 10))
    freshness = args.get("freshness")
    normalized_freshness = freshness if isinstance(freshness, str) else None

    if not resolved_settings.has_search:
        return "Missing BRAVE_API_KEY or SERPER_API_KEY", True

    results: list[SearchResult] | None = None
    provider: str | None = None
    errors: list[str] = []

    if resolved_settings.brave_api_key:
        try:
            results = brave_search(
                resolved_settings.brave_api_key,
                query,
                count,
                normalized_freshness,
            )
            provider = "brave"
        except Exception as exc:  # noqa: BLE001 - preserve provider fallback details
            errors.append(f"Brave: {exc}")

    if results is None and resolved_settings.serper_api_key:
        try:
            results = serper_search(resolved_settings.serper_api_key, query, count)
            provider = "serper"
        except Exception as exc:  # noqa: BLE001 - preserve provider fallback details
            errors.append(f"Serper: {exc}")

    if results is None:
        return f"All search providers failed: {'; '.join(errors)}", True

    response: SearchPayload = {"results": results, "provider": provider}

    if mode == "grounded":
        if not resolved_settings.gemini_api_key:
            response["synthesis_error"] = "GEMINI_API_KEY not configured"
        else:
            try:
                response["synthesis"] = gemini_grounded(
                    query,
                    resolved_settings.gemini_api_key,
                )
            except Exception as exc:  # noqa: BLE001 - raw results should survive
                response["synthesis_error"] = str(exc)

    return json.dumps(response, indent=2), False


TOOLS = {"web-search": web_search}
