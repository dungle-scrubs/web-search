#!/usr/bin/env node
/** Command-line interface: emit normalized SERP JSON for humans and agents alike. */

import { argv } from "node:process";
import { fileURLToPath } from "node:url";
import { Command, Option } from "commander";
import { Effect, Layer } from "effect";
import { formatError } from "./errors.js";
import type { WebSearchError } from "./errors.js";
import { HttpClientLive } from "./http.js";
import { webSearch } from "./search.js";
import { SettingsLive } from "./settings.js";
import type { Freshness } from "./types.js";
import { FRESHNESS } from "./types.js";

interface CliOptions {
  readonly count: string;
  readonly freshness?: Freshness;
  readonly query: string;
}

/** Load .env files when supported, ignoring absence (Node >= 21.7). */
function loadEnvFiles(): void {
  const loader = (process as { loadEnvFile?: (path?: string) => void }).loadEnvFile;
  if (typeof loader !== "function") {
    return;
  }
  for (const file of [".env", ".env.local"]) {
    try {
      loader(file);
    } catch {
      // No such file — expected; credentials may come from the ambient env.
    }
  }
}

export async function run(argv: readonly string[]): Promise<number> {
  loadEnvFiles();

  const program = new Command();
  program
    .name("web-search")
    .description("Search the web via Brave (with Serper fallback). Outputs JSON.")
    .requiredOption("-q, --query <query>", "Search query")
    .option("-c, --count <n>", "Number of results to return, capped at 20", "10")
    .addOption(
      new Option("-f, --freshness <window>", "Filter by recency").choices(FRESHNESS),
    )
    .allowExcessArguments(false);

  program.parse(argv, { from: "user" });
  const options = program.opts<CliOptions>();

  const search = webSearch({
    count: Number.parseInt(options.count, 10),
    freshness: options.freshness,
    query: options.query,
  }).pipe(Effect.provide(Layer.merge(HttpClientLive, SettingsLive)));

  try {
    const value = await Effect.runPromise(search);
    process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
    return 0;
  } catch (error) {
    const message = isWebSearchError(error)
      ? formatError(error)
      : error instanceof Error
        ? error.message
        : String(error);
    process.stderr.write(`${message}\n`);
    return 1;
  }
}

/** Narrow a thrown value to a `WebSearchError` for friendly formatting. */
function isWebSearchError(error: unknown): error is WebSearchError {
  return (
    error instanceof Error &&
    ["MissingQuery", "NoProvider", "AllProvidersFailed"].includes(
      (error as { _tag?: string })._tag ?? "",
    )
  );
}

/** True when this module is the process entry point (not imported by a test). */
function isMain(): boolean {
  const entry = argv[1];
  return entry !== undefined && fileURLToPath(import.meta.url) === entry;
}

if (isMain()) {
  run(argv.slice(2))
    .then((code) => {
      process.exitCode = code;
    })
    .catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      process.stderr.write(`${message}\n`);
      process.exitCode = 1;
    });
}
