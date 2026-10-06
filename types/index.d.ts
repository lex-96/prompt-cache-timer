export type CacheTtl = '5m' | '1h'

// The languages the band speaks.
export type Locale = 'en' | 'ru' | 'uk' | 'de' | 'fr' | 'es' | 'pt' | 'it' | 'ja' | 'zh' | 'ko'

// Where the TTL the timer counts with came from: CLAUDE_CODE_PROMPT_CACHE_TTL,
// the promptCacheTtl setting, the person's /cache choice (remembered), a model
// switch, the band's own reading of hits and misses, or the engine's default
// for the access in use: a subscription (1h), one over its usage limits (5m),
// an API key or a cloud provider (5m).
export type TtlSource = 'env' | 'settings' | 'manual' | 'model' | 'detected' | 'default' | 'overage' | 'api'

export type CacheHit = {
  sentAt: number
  read: number
  write: number
  input: number
  output: number
  model: string
  // Time since the main thread's previous request; null for the first one.
  gapMs: number | null
}

export type CostSnapshot = {
  // Session total at API list prices, as /cost reports it; null when unpriced.
  usd: number | null
  // The session total when the latest main-loop turn started.
  turnStartUsd: number | null
  contextPercent: number | null
}

// The "keep warm" switch: this session only, never remembered, since every
// open session would otherwise spend the plan's limits on its own.
export type KeepWarm = {
  isOn: boolean
  // Warm-ups it made since it was switched on, and what they cost.
  count: number
  spentUsd: number
  // The main thread's last request of the person's own (warm-ups excluded):
  // it switches itself off after a long stretch without one.
  lastRealAt: number
  // The cache entry (by its request's start) it already tried to warm.
  attemptedFor: number
}

declare module 'claude-code' {
  interface PluginState {
    'prompt-cache-timer': {
      last: CacheHit | null
      cost: CostSnapshot
      now: number
      ttl: CacheTtl
      ttlSource: TtlSource
      locale: Locale
      isHidden: boolean
      isDetailed: boolean
      warmingSince: number
      keepWarm: KeepWarm
      warnedFor: number
    }
  }
}
