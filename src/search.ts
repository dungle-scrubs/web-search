/** Orchestration: validate, then Brave with Serper fallback, as an Effect. */

import { Effect } from "effect";
import { boundedCount } from "./count.js";
import type { WebSearchError } from "./errors.js";
import { AllProvidersFailed, MissingQuery, NoProvider } from "./errors.js";
import type { HttpClient } from "./http.js";
import { braveSearch } from "./providers/brave.js";
import { serperSearch } from "./providers/serper.js";
import { hasSearch, Settings } from "./settings.js";
import type { ProviderFailure, SearchArgs, WebSearchResponse } from "./types.js";

/**
 * Run a web search: try Brave first, fall back to Serper, yielding the first
 * provider that succeeds. Provider failures are accumulated and surfaced only
 * if every configured provider fails.
 */
export const webSearch = (
  args: SearchArgs,
): Effect.Effect<WebSearchResponse, WebSearchError, HttpClient | Settings> =>
  Effect.gen(function* () {
    const query = args.query.trim();
    if (query.length === 0) {
      return yield* Effect.fail(new MissingQuery());
    }

    const settings = yield* Settings;
    if (!hasSearch(settings)) {
      return yield* Effect.fail(new NoProvider());
    }

    const count = boundedCount(args.count ?? 10);
    const failures: ProviderFailure[] = [];

    if (settings.braveApiKey !== undefined) {
      const brave = yield* Effect.matchEffect(
        braveSearch(settings.braveApiKey, query, count, args.freshness),
        {
          onFailure: (error) =>
            Effect.succeed({
              ok: false as const,
              failure: { message: error.message, provider: error.provider },
            }),
          onSuccess: (results) => Effect.succeed({ ok: true as const, results }),
        },
      );
      if (brave.ok) {
        return { provider: "brave" as const, results: brave.results };
      }
      failures.push(brave.failure);
    }

    if (settings.serperApiKey !== undefined) {
      const serper = yield* Effect.matchEffect(
        serperSearch(settings.serperApiKey, query, count),
        {
          onFailure: (error) =>
            Effect.succeed({
              ok: false as const,
              failure: { message: error.message, provider: error.provider },
            }),
          onSuccess: (results) => Effect.succeed({ ok: true as const, results }),
        },
      );
      if (serper.ok) {
        return { provider: "serper" as const, results: serper.results };
      }
      failures.push(serper.failure);
    }

    return yield* Effect.fail(new AllProvidersFailed({ failures }));
  });
