import { Effect, Layer } from "effect";
import { describe, expect, it } from "vitest";
import { HttpError } from "../src/errors.js";
import type { HttpClient } from "../src/http.js";
import { braveSearch } from "../src/providers/brave.js";
import { serperSearch } from "../src/providers/serper.js";
import { webSearch } from "../src/search.js";
import { type SettingsShape, settingsLayer } from "../src/settings.js";
import type { SearchArgs } from "../src/types.js";
import { stubHttp } from "./helpers.js";

/** A loose failure shape covering the tagged error variants under test. */
interface Failure {
  readonly _tag: string;
  readonly provider?: string;
  readonly failures?: ReadonlyArray<{ readonly provider: string }>;
}

type Result<A> =
  | { readonly ok: true; readonly value: A }
  | { readonly ok: false; readonly error: Failure };

function settings(overrides: Partial<SettingsShape> = {}): SettingsShape {
  return { braveApiKey: undefined, serperApiKey: undefined, ...overrides };
}

/** Provide a stub transport, run an Effect, and capture failure or success. */
const runProvider = async <A, E>(
  effect: Effect.Effect<A, E, HttpClient>,
  layer: Layer.Layer<HttpClient>,
): Promise<Result<A>> => {
  try {
    const value = await Effect.runPromise(effect.pipe(Effect.provide(layer)));
    return { ok: true, value };
  } catch (error) {
    return { ok: false, error: error as Failure };
  }
};

/** Provide both the transport and settings layers, then run `webSearch`. */
const runSearch = async (
  args: SearchArgs,
  layer: Layer.Layer<HttpClient>,
  config: SettingsShape,
) => {
  try {
    const value = await Effect.runPromise(
      webSearch(args).pipe(Effect.provide(Layer.merge(layer, settingsLayer(config)))),
    );
    return { ok: true as const, value };
  } catch (error) {
    return { ok: false as const, error: error as Failure };
  }
};

describe("braveSearch", () => {
  it("maps results and applies freshness and count bounds", async () => {
    const { layer, requests } = stubHttp(() => ({
      web: {
        results: [
          {
            title: "Test Result",
            url: "https://example.com",
            description: "Test description",
            age: "2 days ago",
          },
        ],
      },
    }));

    const result = await runProvider(
      braveSearch("key", "test query", 100, "week"),
      layer,
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual([
        {
          published: "2 days ago",
          snippet: "Test description",
          title: "Test Result",
          url: "https://example.com",
        },
      ]);
    }
    expect(requests[0]?.url).toContain("count=20");
    expect(requests[0]?.url).toContain("freshness=pw");
    expect(requests[0]?.url).toContain("q=test+query");
  });

  it("returns a provider failure on a transport error", async () => {
    const { layer } = stubHttp(() => new HttpError({ message: "HTTP 429 Error" }));
    const result = await runProvider(braveSearch("key", "test"), layer);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error._tag).toBe("ProviderError");
      expect(result.error.provider).toBe("brave");
    }
  });
});

describe("serperSearch", () => {
  it("maps organic results and sends a bounded num", async () => {
    const { layer, requests } = stubHttp(() => ({
      organic: [
        {
          title: "Serper Result",
          link: "https://example.com",
          snippet: "Snippet",
          date: "Jan 1, 2026",
        },
      ],
    }));

    const result = await runProvider(serperSearch("key", "test query", 2), layer);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual([
        {
          published: "Jan 1, 2026",
          snippet: "Snippet",
          title: "Serper Result",
          url: "https://example.com",
        },
      ]);
    }
    const body = JSON.parse(requests[0]?.body ?? "{}");
    expect(body).toEqual({ num: 2, q: "test query" });
  });
});

describe("webSearch", () => {
  it("rejects an empty query", async () => {
    const { layer } = stubHttp(() => ({}));
    const result = await runSearch(
      { query: "   " },
      layer,
      settings({ braveApiKey: "k" }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error._tag).toBe("MissingQuery");
    }
  });

  it("rejects when no provider is configured", async () => {
    const { layer } = stubHttp(() => ({}));
    const result = await runSearch({ query: "test" }, layer, settings());
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error._tag).toBe("NoProvider");
    }
  });

  it("falls back to serper when brave fails", async () => {
    const { layer } = stubHttp((request) =>
      request.url.includes("brave")
        ? new HttpError({ message: "HTTP 500 Error" })
        : { organic: [{ title: "S", link: "u", snippet: "s" }] },
    );

    const result = await runSearch(
      { query: "test", count: 4 },
      layer,
      settings({ braveApiKey: "brave", serperApiKey: "serper" }),
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.provider).toBe("serper");
      expect(result.value.results[0]?.title).toBe("S");
    }
  });

  it("reports all-providers-failed when every provider errors", async () => {
    const { layer } = stubHttp(() => new HttpError({ message: "HTTP 503 Error" }));
    const result = await runSearch(
      { query: "test" },
      layer,
      settings({ braveApiKey: "brave", serperApiKey: "serper" }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok && result.error._tag === "AllProvidersFailed") {
      expect(result.error.failures?.map((failure) => failure.provider)).toEqual([
        "brave",
        "serper",
      ]);
    }
  });

  it("caps the requested count at 20", async () => {
    const { layer, requests } = stubHttp(() => ({ web: { results: [] } }));
    await runSearch(
      { query: "test", count: 999 },
      layer,
      settings({ braveApiKey: "brave" }),
    );
    expect(requests[0]?.url).toContain("count=20");
  });
});
