/** Typed errors for the web-search library. */

import type { Provider, ProviderFailure } from "./types.js";

/** The query was empty or whitespace-only. */
export class MissingQuery extends Error {
  readonly _tag = "MissingQuery" as const;

  constructor() {
    super("Missing required query");
  }
}

/** No provider credentials were configured. */
export class NoProvider extends Error {
  readonly _tag = "NoProvider" as const;

  constructor() {
    super("No search provider configured");
  }
}

/** Every configured provider failed; their failures are retained for diagnostics. */
export class AllProvidersFailed extends Error {
  readonly _tag = "AllProvidersFailed" as const;
  readonly failures: readonly ProviderFailure[];

  constructor(args: { readonly failures: readonly ProviderFailure[] }) {
    super("All search providers failed");
    this.failures = args.failures;
  }
}

/** A single provider failed, either at the HTTP transport or while decoding. */
export class ProviderError extends Error {
  readonly _tag = "ProviderError" as const;
  readonly provider: Provider;

  constructor(args: { readonly message: string; readonly provider: Provider }) {
    super(args.message);
    this.provider = args.provider;
  }
}

/** A transport-level HTTP failure: non-2xx, network error, or timeout. */
export class HttpError extends Error {
  readonly _tag = "HttpError" as const;

  constructor(args: { readonly message: string }) {
    super(args.message);
  }
}

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
