# Changelog

## 1.0.0

First public release.

- Countdown to the prompt cache's expiry above the prompt, with a progress bar. Whole minutes far from expiry, seconds in the last two minutes, so the band redraws only when what it shows changes.
- The cache TTL, in this order: `CLAUDE_CODE_PROMPT_CACHE_TTL`, the `promptCacheTtl` setting, `/cache 5m` or `/cache 1h`, a model switch, then the engine's default for the access in use (1h on a subscription within its limits, 5m past them, on an API key, Bedrock, Vertex AI or Foundry). Corrected from cache hits and misses after a pause between 5 and 60 minutes.
- Session cost and the latest turn's cost at API list prices, and the context window's fill.
- Near expiry: what a warm-up costs next to what a miss would, a Warm up button, and a marker on a request that missed the cache.
- Auto warm-up: warms the cache just before it lapses, at most once per cache entry, a long-running command included; turns itself off after 4 hours without a request of yours. Per session, off by default.
- Warm up says at once that it started (a warm-up reads the whole conversation and can take half a minute), and an error from the engine is shown rather than swallowed. A warm-up lost to a reload never leaves the button stuck.
- Narrow bands drop the least useful parts first; the countdown and the controls always stay.
- 11 languages (English, Russian, Ukrainian, German, French, Spanish, Portuguese, Italian, Japanese, Chinese, Korean), picked from the Language option, Claude Code's `language` setting or the system language.
