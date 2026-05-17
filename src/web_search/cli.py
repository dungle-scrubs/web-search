"""Command line interface for web-search."""

from __future__ import annotations

import argparse
import sys

from web_search.search import web_search


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="web-search",
        description="Search the web with Brave/Serper and optional Gemini grounding.",
    )
    parser.add_argument("--query", "-q", required=True, help="Search query")
    parser.add_argument(
        "--mode",
        choices=("raw", "grounded"),
        default="raw",
        help="Search mode",
    )
    parser.add_argument(
        "--count",
        type=int,
        default=10,
        help="Number of results to return, capped at 20",
    )
    parser.add_argument(
        "--freshness",
        choices=("day", "week", "month", "year"),
        help="Filter results by recency",
    )
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    result, is_error = web_search(
        {
            "query": args.query,
            "mode": args.mode,
            "count": args.count,
            "freshness": args.freshness,
        }
    )
    stream = sys.stderr if is_error else sys.stdout
    print(result, file=stream)
    return 1 if is_error else 0


if __name__ == "__main__":
    raise SystemExit(main())
