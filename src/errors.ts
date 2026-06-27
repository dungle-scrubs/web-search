/** Typed errors for the web-search library, modeled with `Data.TaggedError`. */

import { Data } from "effect";
import type { Provider, ProviderFailure } from "./types.js";

/** The query was empty or whitespace-only. */
export class MissingQuery extends Data.TaggedError("MissingQuery")<
  Record<never, never>
> {}

/** No provider credentials were configured. */
export class NoProvider extends Data.TaggedError("NoProvider")<Record<never, never>> {}

/** Every configured provider failed; their failures are retained for diagnostics. */
export class AllProvidersFailed extends Data.TaggedError("AllProvidersFailed")<{
  readonly failures: readonly ProviderFailure[];
}> {}

/** A single provider failed, either at the HTTP transport or while decoding. */
export class ProviderError extends Data.TaggedError("ProviderError")<{
  readonly message: string;
  readonly provider: Provider;
}> {}

/** A transport-level HTTP failure: non-2xx, network error, or timeout. */
export class HttpError extends Data.TaggedError("HttpError")<{
  readonly message: string;
}> {}

/** The error channel of `webSearch`: validation failure or exhausted fallback. */
export type WebSearchError = MissingQuery | NoProvider | AllProvidersFailed;

/** Render a `WebSearchError` as a human-readable message. */
export function formatError(error: WebSearchError): string {
  switch (error._tag) {
    case "MissingQuery":
      return "Missing required 'query' parameter";
    case "NoProvider":
      return "Missing BRAVE_API_KEY or SERPER_API_KEY";
    case "AllProvidersFailed": {
      const detail = error.failures
        .map((failure) => `${failure.provider}: ${failure.message}`)
        .join("; ");
      return `All search providers failed: ${detail}`;
    }
  }
}
