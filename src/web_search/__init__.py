"""Standalone web-search CLI and library."""

from web_search.search import (
    SearchSettings,
    brave_search,
    gemini_grounded,
    serper_search,
    web_search,
)

__all__ = [
    "SearchSettings",
    "brave_search",
    "gemini_grounded",
    "serper_search",
    "web_search",
]
