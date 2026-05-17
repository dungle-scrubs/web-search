"""CLI tests for web-search."""

from __future__ import annotations

from unittest.mock import patch

from web_search.cli import main


def test_cli_prints_search_result(capsys) -> None:
    with patch(
        "web_search.cli.web_search",
        return_value=('{"results": [], "provider": "brave"}', False),
    ) as search:
        assert main(["--query", "test", "--mode", "raw", "--count", "3"]) == 0

    search.assert_called_once()
    captured = capsys.readouterr()
    assert '"provider": "brave"' in captured.out
    assert captured.err == ""


def test_cli_returns_nonzero_for_search_error(capsys) -> None:
    with patch("web_search.cli.web_search", return_value=("Missing key", True)):
        assert main(["--query", "test"]) == 1

    captured = capsys.readouterr()
    assert captured.out == ""
    assert "Missing key" in captured.err
