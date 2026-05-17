"""Provider and orchestration tests for web-search."""

from __future__ import annotations

import json
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import pytest

from web_search.search import (
    SearchSettings,
    brave_search,
    gemini_grounded,
    serper_search,
    web_search,
)


def settings(
    *,
    brave: str | None = None,
    serper: str | None = None,
    gemini: str | None = None,
) -> SearchSettings:
    return SearchSettings(
        BRAVE_API_KEY=brave,
        SERPER_API_KEY=serper,
        GEMINI_API_KEY=gemini,
    )


def client_context(response: MagicMock) -> MagicMock:
    client = MagicMock()
    client.get.return_value = response
    client.post.return_value = response
    context = MagicMock()
    context.__enter__.return_value = client
    context.__exit__.return_value = False
    return context


def test_brave_search_maps_results_and_freshness() -> None:
    response = MagicMock()
    response.json.return_value = {
        "web": {
            "results": [
                {
                    "title": "Test Result",
                    "url": "https://example.com",
                    "description": "Test description",
                    "age": "2 days ago",
                }
            ]
        }
    }

    with patch("httpx.Client", return_value=client_context(response)) as http_client:
        results = brave_search("key", "test query", count=100, freshness="week")

    assert results == [
        {
            "title": "Test Result",
            "url": "https://example.com",
            "snippet": "Test description",
            "published": "2 days ago",
        }
    ]
    client = http_client.return_value.__enter__.return_value
    assert client.get.call_args.kwargs["params"] == {
        "q": "test query",
        "count": 20,
        "freshness": "pw",
    }


def test_serper_search_maps_results() -> None:
    response = MagicMock()
    response.json.return_value = {
        "organic": [
            {
                "title": "Serper Result",
                "link": "https://example.com",
                "snippet": "Snippet",
                "date": "Jan 1, 2026",
            }
        ]
    }

    with patch("httpx.Client", return_value=client_context(response)) as http_client:
        results = serper_search("key", "test query", count=2)

    assert results[0]["title"] == "Serper Result"
    assert results[0]["url"] == "https://example.com"
    client = http_client.return_value.__enter__.return_value
    assert client.post.call_args.kwargs["json"] == {"q": "test query", "num": 2}


def test_web_search_requires_query() -> None:
    result, is_error = web_search({}, settings=settings(brave="key"))

    assert is_error
    assert result == "Missing required 'query' parameter"


def test_web_search_requires_search_provider() -> None:
    result, is_error = web_search({"query": "test"}, settings=settings())

    assert is_error
    assert result == "Missing BRAVE_API_KEY or SERPER_API_KEY"


def test_web_search_falls_back_to_serper_when_brave_fails() -> None:
    with (
        patch("web_search.search.brave_search", side_effect=RuntimeError("bad brave")),
        patch(
            "web_search.search.serper_search",
            return_value=[
                {"title": "S", "url": "u", "snippet": "s", "published": None}
            ],
        ) as serper,
    ):
        result, is_error = web_search(
            {"query": "test", "count": 4},
            settings=settings(brave="brave", serper="serper"),
        )

    assert not is_error
    payload = json.loads(result)
    assert payload["provider"] == "serper"
    assert payload["results"][0]["title"] == "S"
    serper.assert_called_once_with("serper", "test", 4)


def test_grounded_mode_returns_raw_results_when_gemini_missing() -> None:
    with patch(
        "web_search.search.brave_search",
        return_value=[{"title": "B", "url": "u", "snippet": "s", "published": None}],
    ):
        result, is_error = web_search(
            {"query": "test", "mode": "grounded"},
            settings=settings(brave="brave"),
        )

    assert not is_error
    payload = json.loads(result)
    assert payload["provider"] == "brave"
    assert payload["synthesis_error"] == "GEMINI_API_KEY not configured"


def test_grounded_mode_adds_synthesis() -> None:
    with (
        patch(
            "web_search.search.brave_search",
            return_value=[
                {"title": "B", "url": "u", "snippet": "s", "published": None}
            ],
        ),
        patch(
            "web_search.search.gemini_grounded",
            return_value={"answer": "Answer", "sources": [{"title": "T", "url": "U"}]},
        ),
    ):
        result, is_error = web_search(
            {"query": "test", "mode": "grounded"},
            settings=settings(brave="brave", gemini="gemini"),
        )

    assert not is_error
    payload = json.loads(result)
    assert payload["synthesis"]["answer"] == "Answer"


def test_gemini_grounded_extracts_grounding_chunks() -> None:
    web = SimpleNamespace(title="Source", uri="https://example.com")
    chunk = SimpleNamespace(web=web)
    metadata = SimpleNamespace(grounding_chunks=[chunk])
    candidate = SimpleNamespace(grounding_metadata=metadata)
    response = SimpleNamespace(text="Grounded answer", candidates=[candidate])
    client = MagicMock()
    client.models.generate_content.return_value = response

    with patch("web_search.search.genai.Client", return_value=client):
        result = gemini_grounded("test", "key")

    assert result == {
        "answer": "Grounded answer",
        "sources": [{"title": "Source", "url": "https://example.com"}],
    }


@pytest.mark.parametrize("count", [0, -1, 999])
def test_count_is_bounded(count: int) -> None:
    with patch(
        "web_search.search.brave_search",
        return_value=[{"title": "B", "url": "u", "snippet": "s", "published": None}],
    ) as brave:
        result, is_error = web_search(
            {"query": "test", "count": count},
            settings=settings(brave="brave"),
        )

    assert not is_error
    assert json.loads(result)["provider"] == "brave"
    assert 1 <= brave.call_args.args[2] <= 20
