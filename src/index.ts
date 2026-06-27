/** Public API for the web-search library (Effect-native). */

export { boundedCount, MAX_RESULTS } from "./count.js";
export type { WebSearchError } from "./errors.js";
export {
  AllProvidersFailed,
  formatError,
  HttpError,
  MissingQuery,
  NoProvider,
  ProviderError,
} from "./errors.js";
export type { HttpRequest } from "./http.js";
export { HttpClient, HttpClientLive } from "./http.js";
export { braveSearch } from "./providers/brave.js";
export { serperSearch } from "./providers/serper.js";
export { webSearch } from "./search.js";
export type { SettingsShape } from "./settings.js";
export {
  hasSearch,
  Settings,
  SettingsLive,
  settingsFromEnv,
  settingsLayer,
} from "./settings.js";
export type {
  Freshness,
  Provider,
  ProviderFailure,
  SearchArgs,
  Source,
  WebSearchResponse,
} from "./types.js";
export { FRESHNESS } from "./types.js";
