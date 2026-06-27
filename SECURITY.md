# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in `web-search`, please report it privately
rather than opening a public issue.

**Email:** kevin@dungle-scrubs.dev

Please include:

- A description of the vulnerability
- Steps to reproduce
- Affected versions (or commit range)
- Any potential mitigations you've identified

You should receive a response within 48 hours. After the issue is confirmed and a fix
is released, you are welcome to disclose it publicly (and we'll credit you unless you
prefer to remain anonymous).

## Supported Versions

Only the latest release receives security patches. The table below tracks which
versions are currently supported.

| Version | Supported          |
| ------- | ------------------ |
| 0.2.x   | :white_check_mark: |
| < 0.2   | :x:                |

## Supply Chain

- Dependencies are pinned via `pnpm-lock.yaml` with integrity hashes.
- `prepare` script runs on install to build from source; `dist/` is not committed.
- Pre-commit hooks (Lefthook) run Biome format, Biome lint, and TypeScript type-checking
  on every commit.
