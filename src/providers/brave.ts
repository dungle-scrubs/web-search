/** Brave Search provider — the primary backend. */

import { Effect, Schema } from "effect";
import { boundedCount } from "../count.js";
import { ProviderError } from "../errors.js";
import { HttpClient } from "../http.js";
import { BraveResponse } from "../schema.js";
import type { Freshness, Source } from "../types.js";

const ENDPOINT = "https://api.search.brave.com/res/v1/web/search";

const FRESHNESS_MAP = {
  day: "pd",
  month: "pm",
  week: "pw",
  year: "py",
} as const satisfies Record<Freshness, string>;

/** Query Brave Search and normalize its results into `Source[]`. */
export const braveSearch = (
  apiKey: string,
  query: string,
  count = 10,
  freshness?: Freshness,
): Effect.Effect<readonly Source[], ProviderError, HttpClient> =>
  Effect.gen(function* () {
    const http = yield* HttpClient;
    const params = new URLSearchParams({
      count: String(boundedCount(count)),
      q: query,
    });
    if (freshness) {
      params.set("freshness", FRESHNESS_MAP[freshness]);
    }

    const json = yield* http
      .fetchJson({
        url: `${ENDPOINT}?${params.toString()}`,
        headers: {
          Accept: "application/json",
          "X-Subscription-Token": apiKey,
        },
      })
      .pipe(
        Effect.mapError(
          (error) => new ProviderError({ message: error.message, provider: "brave" }),
        ),
      );

    const decoded = yield* Schema.decodeUnknown(BraveResponse)(json).pipe(
      Effect.mapError(
        (error) => new ProviderError({ message: error.message, provider: "brave" }),
      ),
    );
    return decoded.web.results;
  });
