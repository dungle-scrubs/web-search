/** Core domain types for the web-search library. */

/** Recency filter accepted by `webSearch`. Brave-only; ignored by Serper. */
export const FRESHNESS = ["day", "week", "month", "year"] as const;
export type Freshness = (typeof FRESHNESS)[number];

/** Search backends, in fallback order. */
export type Provider = "brave" | "serper";

/** A single normalized search result, uniform across providers. */
export interface Source {
  /** Provider-reported recency string (e.g. "2 days ago"), or null when absent. */
  readonly published: string | null;
  readonly snippet: string;
  readonly title: string;
  readonly url: string;
}

/** A successful search: the results plus which provider served them. */
export interface WebSearchResponse {
  readonly provider: Provider;
  readonly results: readonly Source[];
}

/** A single provider's failure, retained for fallback diagnostics. */
export interface ProviderFailure {
  readonly message: string;
  readonly provider: Provider;
}

/** Arguments for a single `webSearch` call. */
export interface SearchArgs {
  readonly count?: number;
  readonly freshness?: Freshness | undefined;
  readonly query: string;
}
