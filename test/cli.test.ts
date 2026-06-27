import { afterEach, describe, expect, it, vi } from "vitest";
import { run } from "../src/cli.js";

function jsonResponse(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    statusText: "OK",
    json: async () => body,
  } as unknown as Response;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("run", () => {
  it("prints normalized JSON and exits 0 on success", async () => {
    vi.stubEnv("BRAVE_API_KEY", "key");
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(
          jsonResponse({
            web: { results: [{ title: "T", url: "https://x", description: "d" }] },
          }),
        ),
      ),
    );
    const out = vi.spyOn(process.stdout, "write").mockReturnValue(true);

    const code = await run(["--query", "test", "--count", "3"]);

    expect(code).toBe(0);
    const printed = out.mock.calls[0]?.[0] as string;
    const payload = JSON.parse(printed);
    expect(payload.provider).toBe("brave");
    expect(payload.results[0].title).toBe("T");
  });

  it("writes an error to stderr and exits 1 when no provider is configured", async () => {
    vi.stubEnv("BRAVE_API_KEY", "");
    vi.stubEnv("SERPER_API_KEY", "");
    const err = vi.spyOn(process.stderr, "write").mockReturnValue(true);

    const code = await run(["--query", "test"]);

    expect(code).toBe(1);
    expect(err.mock.calls[0]?.[0]).toContain("Missing BRAVE_API_KEY or SERPER_API_KEY");
  });
});
