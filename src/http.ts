/** HTTP client as an injectable service: JSON fetch with a hard timeout. */

import { Context, Duration, Effect, Layer } from "effect";
import { HttpError } from "./errors.js";

const TIMEOUT = Duration.seconds(30);

export interface HttpRequest {
  readonly body?: string;
  readonly headers: Record<string, string>;
  readonly method?: "GET" | "POST";
  readonly url: string;
}

/**
 * Fetches a URL and parses JSON, surfacing non-2xx, network, and timeout
 * failures as `HttpError`. Provided as a service so callers (and tests) can swap
 * the transport via a `Layer`.
 */
export class HttpClient extends Context.Tag("web-search/HttpClient")<
  HttpClient,
  { readonly fetchJson: (request: HttpRequest) => Effect.Effect<unknown, HttpError> }
>() {}

function toHttpError(error: unknown): HttpError {
  return new HttpError({
    message: error instanceof Error ? error.message : String(error),
  });
}

const fetchJson = (request: HttpRequest): Effect.Effect<unknown, HttpError> =>
  Effect.gen(function* () {
    const response = yield* Effect.tryPromise({
      // The signal is aborted when this effect is interrupted (e.g. on timeout).
      try: (signal) =>
        fetch(request.url, {
          body: request.body,
          headers: request.headers,
          method: request.method ?? "GET",
          signal,
        }),
      catch: toHttpError,
    });
    if (!response.ok) {
      return yield* new HttpError({
        message: `HTTP ${response.status} ${response.statusText}`,
      });
    }
    return yield* Effect.tryPromise({
      try: () => response.json(),
      catch: toHttpError,
    });
  }).pipe(
    Effect.timeoutFail({
      duration: TIMEOUT,
      onTimeout: () =>
        new HttpError({ message: `timed out after ${Duration.toMillis(TIMEOUT)}ms` }),
    }),
  );

/** Live HTTP client backed by the global `fetch`. */
export const HttpClientLive = Layer.succeed(HttpClient, { fetchJson });
