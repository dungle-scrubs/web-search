/**
 * Schema decoders for untrusted provider JSON, the single source of truth for
 * each provider's wire shape. Fields are optional with defaults so that a
 * provider omitting a key yields a well-formed `Source` rather than a failure;
 * a present-but-malformed field surfaces as a decode error.
 */

import { Schema } from "effect";

/** An optional string field, defaulting to "" when the key is absent. */
const optionalText = Schema.optionalWith(Schema.String, { default: () => "" });

/** An optional recency field, defaulting to null when the key is absent. */
const optionalDate = Schema.optionalWith(Schema.NullOr(Schema.String), {
  default: () => null,
});

/** A Brave `web.results[]` item, normalized to `Source` field names. */
const BraveItem = Schema.Struct({
  title: optionalText,
  url: optionalText,
  snippet: optionalText.pipe(Schema.fromKey("description")),
  published: optionalDate.pipe(Schema.fromKey("age")),
});

/** Brave's response envelope; decodes to `{ web: { results: Source[] } }`. */
export const BraveResponse = Schema.Struct({
  web: Schema.optionalWith(
    Schema.Struct({
      results: Schema.optionalWith(Schema.Array(BraveItem), {
        default: () => [],
      }),
    }),
    { default: () => ({ results: [] }) },
  ),
});

/** A Serper `organic[]` item, normalized to `Source` field names. */
const SerperItem = Schema.Struct({
  title: optionalText,
  url: optionalText.pipe(Schema.fromKey("link")),
  snippet: optionalText,
  published: optionalDate.pipe(Schema.fromKey("date")),
});

/** Serper's response envelope; decodes to `{ organic: Source[] }`. */
export const SerperResponse = Schema.Struct({
  organic: Schema.optionalWith(Schema.Array(SerperItem), { default: () => [] }),
});
