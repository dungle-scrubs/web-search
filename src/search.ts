/** Orchestration: validate, then Brave with Serper fallback, as an Effect. */

import { Effect, Either } from "effect";
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
      return yield* new MissingQuery();
    }

    const settings = yield* Settings;
    if (!hasSearch(settings)) {
      return yield* new NoProvider();
    }

    const count = boundedCount(args.count ?? 10);
    const failures: ProviderFailure[] = [];

    if (settings.braveApiKey !== undefined) {
      const brave = yield* Effect.either(
        braveSearch(settings.braveApiKey, query, count, args.freshness),
      );
      if (Either.isRight(brave)) {
        return { provider: "brave" as const, results: brave.right };
      }
      failures.push({ message: brave.left.message, provider: brave.left.provider });
    }

    if (settings.serperApiKey !== undefined) {
      const serper = yield* Effect.either(
        serperSearch(settings.serperApiKey, query, count),
      );
      if (Either.isRight(serper)) {
        return { provider: "serper" as const, results: serper.right };
      }
      failures.push({ message: serper.left.message, provider: serper.left.provider });
    }

    return yield* new AllProvidersFailed({ failures });
  });
