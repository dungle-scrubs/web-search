/** Serper (Google) provider — the fallback backend. */

import { Effect, Schema } from "effect";
import { boundedCount } from "../count.js";
import { ProviderError } from "../errors.js";
import { HttpClient } from "../http.js";
import { SerperResponse } from "../schema.js";
import type { Source } from "../types.js";

const ENDPOINT = "https://google.serper.dev/search";

/** Query Serper and normalize its organic results into `Source[]`. */
export const serperSearch = (
  apiKey: string,
  query: string,
  count = 10,
): Effect.Effect<readonly Source[], ProviderError, HttpClient> =>
  Effect.gen(function* () {
    const http = yield* HttpClient;

    const json = yield* http
      .fetchJson({
        url: ENDPOINT,
        body: JSON.stringify({ num: boundedCount(count), q: query }),
        headers: {
          "Content-Type": "application/json",
          "X-API-KEY": apiKey,
        },
        method: "POST",
      })
      .pipe(
        Effect.mapError(
          (error) => new ProviderError({ message: error.message, provider: "serper" }),
        ),
      );

    const decoded = yield* Schema.decodeUnknown(SerperResponse)(json).pipe(
      Effect.mapError(
        (error) => new ProviderError({ message: error.message, provider: "serper" }),
      ),
    );
    return decoded.organic;
  });
