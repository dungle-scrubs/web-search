/** Provider credentials as an injectable service, resolved from the environment. */

import { Context, Layer } from "effect";

export interface SettingsShape {
  readonly braveApiKey: string | undefined;
  readonly serperApiKey: string | undefined;
}

/** The resolved provider credentials. */
export class Settings extends Context.Tag("web-search/Settings")<
  Settings,
  SettingsShape
>() {}

/** Treat missing or whitespace-only credentials as unset. */
function nonBlank(value: string | undefined): string | undefined {
  return value !== undefined && value.trim().length > 0 ? value : undefined;
}

/** Read provider credentials from a process environment (defaults to `process.env`). */
export function settingsFromEnv(env: NodeJS.ProcessEnv = process.env): SettingsShape {
  return {
    braveApiKey: nonBlank(env.BRAVE_API_KEY),
    serperApiKey: nonBlank(env.SERPER_API_KEY),
  };
}

/** Whether at least one search provider is configured. */
export function hasSearch(settings: SettingsShape): boolean {
  return settings.braveApiKey !== undefined || settings.serperApiKey !== undefined;
}

/** Settings resolved from `process.env` when the layer is built. */
export const SettingsLive = Layer.sync(Settings, () => settingsFromEnv());

/** Settings from an explicit record, for tests and embedding. */
export const settingsLayer = (settings: SettingsShape): Layer.Layer<Settings> =>
  Layer.succeed(Settings, settings);
