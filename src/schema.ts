/**
 * Schema decoders for untrusted provider JSON, the single source of truth for
 * each provider's wire shape. Fields are optional in the encoded (input) form
 * with a default, so a provider omitting a key yields a well-formed `Source`
 * rather than a failure; a present-but-malformed field surfaces as a decode
 * error.
 */

import { Effect, Schema } from "effect";

/** A string field defaulting to "" when the key is absent. */
const optionalText = Schema.String.pipe(
  Schema.withDecodingDefaultKey(Effect.succeed("")),
);

/** A recency field (string | null) defaulting to null when the key is absent. */
const optionalDate = Schema.NullOr(Schema.String).pipe(
  Schema.withDecodingDefaultKey(Effect.succeed(null)),
);

/**
 * A Brave `web.results[]` item, normalized to `Source` field names.
 * Brave sends `description` (-> snippet) and `age` (-> published).
 */
const BraveItem = Schema.Struct({
  title: optionalText,
  url: optionalText,
  snippet: optionalText,
  published: optionalDate,
}).pipe(Schema.encodeKeys({ snippet: "description", published: "age" }));

/** Brave's response envelope; decodes to `{ web: { results: Source[] } }`. */
export const BraveResponse = Schema.Struct({
  web: Schema.Struct({
    results: Schema.Array(BraveItem).pipe(
      Schema.withDecodingDefaultKey(Effect.succeed([])),
    ),
  }).pipe(Schema.withDecodingDefaultKey(Effect.succeed({ results: [] }))),
});

/**
 * A Serper `organic[]` item, normalized to `Source` field names.
 * Serper sends `link` (-> url) and `date` (-> published).
 */
const SerperItem = Schema.Struct({
  title: optionalText,
  url: optionalText,
  snippet: optionalText,
  published: optionalDate,
}).pipe(Schema.encodeKeys({ url: "link", published: "date" }));

/** Serper's response envelope; decodes to `{ organic: Source[] }`. */
export const SerperResponse = Schema.Struct({
  organic: Schema.Array(SerperItem).pipe(
    Schema.withDecodingDefaultKey(Effect.succeed([])),
  ),
});
