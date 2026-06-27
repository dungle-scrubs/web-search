# web-search

A small TypeScript library and CLI for normalized web search. It queries
**Brave Search** and falls back to **Serper** (Google), returning a uniform
`Source[]` shape. Designed to be embedded as the search backend in research
tools (e.g. `deep-research`) and to be driven directly as an agent tool.

It does **one** thing: turn a query into normalized SERP results. There is no
LLM synthesis — grounding/answer-generation belongs in the layer above, where
sources can be fetched and verified.

## Install

```bash
pnpm add web-search
```

Set credentials via the environment (or a `.env` / `.env.local` file):

```bash
BRAVE_API_KEY=...    # primary provider
SERPER_API_KEY=...   # fallback provider
```

## Library

The library is **Effect-native**: `webSearch` returns an
`Effect<WebSearchResponse, WebSearchError, HttpClient | Settings>`. The error
channel is typed (`MissingQuery | NoProvider | AllProvidersFailed`) and the HTTP
transport and credentials are injected as services, so you compose and run it
with your own Effect runtime. (`effect` is a runtime dependency.)

```ts
import { Effect, Layer } from "effect";
import { HttpClientLive, SettingsLive, webSearch } from "web-search";

const program = webSearch({
  query: "Node.js current LTS",
  count: 5,
  freshness: "month",
}).pipe(Effect.provide(Layer.merge(HttpClientLive, SettingsLive)));

// Run it: success yields a WebSearchResponse; failure is a typed WebSearchError.
const response = await Effect.runPromise(program);
for (const source of response.results) {
  console.log(source.title, source.url);
}
```

Handle the typed error channel without throwing via `Effect.either` (or
`Effect.runPromiseExit`), and render failures with `formatError`:

```ts
import { Effect, Either } from "effect";
import { formatError } from "web-search";

const result = await Effect.runPromise(Effect.either(program));
if (Either.isLeft(result)) {
  console.error(result.left._tag, formatError(result.left));
}
```

### Services and dependency injection

Two services are provided as `Layer`s, and either can be swapped:

- **`Settings`** — provider credentials. `SettingsLive` reads `BRAVE_API_KEY` /
  `SERPER_API_KEY` from `process.env`; `settingsLayer({ braveApiKey, serperApiKey })`
  supplies them explicitly.
- **`HttpClient`** — the JSON transport (a `fetch` with a 30s timeout).
  `HttpClientLive` is the default; provide your own `Layer` to stub the transport
  in tests without touching global `fetch`.

Individual providers `braveSearch` and `serperSearch` are also exported; each
returns an `Effect<readonly Source[], ProviderError, HttpClient>`.

## CLI

Outputs JSON on stdout (exit 0); errors go to stderr (exit 1).

```bash
web-search --query "Claude Code updates" --freshness week --count 5
web-search -q "Python 3.13 release date"
```

| Flag | Description |
| --- | --- |
| `-q, --query <query>` | Search query (required) |
| `-c, --count <n>` | Number of results, capped at 20 (default 10) |
| `-f, --freshness <window>` | `day` \| `week` \| `month` \| `year` (Brave only) |

## Development

```bash
pnpm install
pnpm test        # vitest
pnpm typecheck   # tsc --noEmit
pnpm check       # biome lint + format check
pnpm build       # emit dist/
```

Pre-commit hooks (lefthook) run biome format, biome lint, and typecheck.
