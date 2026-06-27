# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.0] - 2026-06-23

### ⚠️ Breaking Changes

- Library rewritten as Effect-native: `webSearch` returns `Effect<WebSearchResponse, WebSearchError, HttpClient | Settings>`. The injected `HttpClient` and `Settings` services replace the previous implicit `fetch`/`process.env` coupling.

### Added

- Injectable `HttpClient` service with 30s timeout and abort-signal propagation
- Injectable `Settings` service with env-based (`SettingsLive`) and explicit (`settingsLayer`) layers
- Effect Schema decoders for Brave and Serper JSON with `optionalWith`/`default` for resilience
- Typed error channel: `MissingQuery | NoProvider | AllProvidersFailed` via `Data.TaggedError`
- CLI: `web-search --query`, `--count`, `--freshness` flags, JSON stdout / error stderr contract
- CLI `.env` / `.env.local` auto-loading (Node >= 21.7)
- `formatError` helper for rendering typed errors as human-readable messages
- Individual provider exports: `braveSearch`, `serperSearch` for standalone use
- `boundedCount` / `MAX_RESULTS` for count clamping (1–20)

### Changed

- Migrated from Biome v1 to v2
- Migrated from TypeScript 5 to TypeScript 6
- Renamed `BRAVE_KEY` → `BRAVE_API_KEY`, `SERPER_KEY` → `SERPER_API_KEY`

### Fixed

- `prepare` script now builds `dist/` so the package installs as a git dependency

## [0.1.0] - 2026-06-02

### Added

- Initial TypeScript rewrite from Python: pure-SERP web search library
- Brave Search provider with recency filtering (`day`, `week`, `month`, `year`)
- Serper (Google) fallback provider
- Normalized `Source` type across providers
- `webSearch` orchestration: Brave → Serper with fallback
- TypeScript toolchain: pnpm, Biome, Lefthook, vitest
- MIT license

[Unreleased]: https://github.com/dungle-scrubs/web-search/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/dungle-scrubs/web-search/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/dungle-scrubs/web-search/releases/tag/v0.1.0
