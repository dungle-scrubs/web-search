import { Effect, Layer } from "effect";
import { HttpError } from "../src/errors.js";
import type { HttpRequest } from "../src/http.js";
import { HttpClient } from "../src/http.js";

/**
 * A canned `HttpClient` layer that records every request and replays the
 * handler's result. Return an `HttpError` from the handler to simulate a
 * transport failure; return any other value to simulate a decoded JSON body.
 */
export function stubHttp(handler: (request: HttpRequest) => unknown): {
  readonly layer: Layer.Layer<HttpClient>;
  readonly requests: readonly HttpRequest[];
} {
  const requests: HttpRequest[] = [];
  const layer = Layer.succeed(HttpClient, {
    fetchJson: (request) =>
      Effect.suspend(() => {
        requests.push(request);
        const result = handler(request);
        return result instanceof HttpError
          ? Effect.fail(result)
          : Effect.succeed(result);
      }),
  });
  return { layer, requests };
}
