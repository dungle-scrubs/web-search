# Web Search

Standalone web-search CLI and Python library used by tool-proxy adapters and research workflows.

It provides:

- Raw Brave Search results with Serper fallback
- Optional Gemini grounded synthesis with citations
- A small Python API suitable for embedding in higher-level research tools

## CLI

```bash
web-search --query "Node.js current LTS" --mode grounded
web-search --query "Claude Code updates" --freshness week --count 5
```

## Python

```python
from web_search.search import web_search

result_json, is_error = web_search({"query": "Python 3.13 release date"})
```
