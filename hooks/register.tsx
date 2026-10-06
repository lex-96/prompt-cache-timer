import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { CacheHit, CacheTtl, CostSnapshot, KeepWarm, TtlSource } from '../types'
import { STRINGS, resolveLocale, systemLocale } from './i18n'
import type { Strings } from './i18n'

const last = atom({ plugin: 'prompt-cache-timer', key: 'last' } as const, null)
const NO_COST: CostSnapshot = { usd: null, turnStartUsd: null, contextPercent: null }
const cost = atom({ plugin: 'prompt-cache-timer', key: 'cost' } as const, NO_COST)
const now = atom({ plugin: 'prompt-cache-timer', key: 'now' } as const, 0)
const ttl = atom({ plugin: 'prompt-cache-timer', key: 'ttl' } as const, '1h')
const ttlSource = atom({ plugin: 'prompt-cache-timer', key: 'ttlSource' } as const, 'default')
const locale = atom({ plugin: 'prompt-cache-timer', key: 'locale' } as const, 'en')
const isHidden = atom({ plugin: 'prompt-cache-timer', key: 'isHidden' } as const, false)
const isDetailed = atom({ plugin: 'prompt-cache-timer', key: 'isDetailed' } as const, false)
// When the warm-up in flight started; 0 when none is.
const warmingSince = atom({ plugin: 'prompt-cache-timer', key: 'warmingSince' } as const, 0)
const KEEP_WARM_OFF: KeepWarm = { isOn: false, count: 0, spentUsd: 0, lastRealAt: 0, attemptedFor: 0 }
const keepWarm = atom({ plugin: 'prompt-cache-timer', key: 'keepWarm' } as const, KEEP_WARM_OFF)
const warnedFor = atom({ plugin: 'prompt-cache-timer', key: 'warnedFor' } as const, 0)

const TTL_STORE_KEY = 'ttl'
const MINUTE = 60_000
const TTL_MS: Record<CacheTtl, number> = { '5m': 5 * MINUTE, '1h': 60 * MINUTE }
// Warn this long before the cache lapses.
const WARN_MS: Record<CacheTtl, number> = { '5m': MINUTE, '1h': 5 * MINUTE }
// The warm-up button shows from this long before the cache lapses.
const WARM_SHOWN_MS: Record<CacheTtl, number> = { '5m': 2 * MINUTE, '1h': 10 * MINUTE }
const WARM_PROMPT = 'Reply with the single word: ok'
// A warm-up reads the whole conversation and takes up to half a minute; one
// that has not answered in this long is taken for lost, so it never blocks
// the next one for good.
const WARM_STALE_MS = 3 * MINUTE

function isWarmingAt(since: number, t: number): boolean {
  return since > 0 && t - since < WARM_STALE_MS
}
// Keeping warm: how long before expiry the warm-up goes out (it must start
// before the entry lapses), and how long without a request of the person's
// own before the switch turns itself off.
const KEEP_WARM_LEAD_MS: Record<CacheTtl, number> = { '5m': 45_000, '1h': 2 * MINUTE }
const KEEP_WARM_MAX_IDLE_MS = 4 * 60 * MINUTE

// A request that wrote at least this much and more than it read missed the
// cache; smaller writes are the turn's own new tail.
const MISS_MIN_TOKENS = 4096
// Gaps this close to a TTL boundary prove nothing either way.
const BOUNDARY_MS = 30_000

const BAR_CELLS = 12

// A subscription's usage windows, as the last response reports them; an API
// key reports none. The engine caches for an hour within a subscription's
// limits and for five minutes otherwise.
const SUBSCRIPTION_WINDOWS: readonly string[] = ['five_hour', 'seven_day']
// The sources the access in use may overwrite: none the person set, nor the
// band's own reading of hits and misses.
const ACCESS_SOURCES: readonly TtlSource[] = ['default', 'overage', 'api']

// Anthropic list prices (the claude-api skill's model table, 2026-09-25):
// input $ per MTok, and what a cache read costs relative to input. Cache
// writes cost 1.25x input on the 5-minute TTL and 2x on the 1-hour one.
// Matched in order, so a longer id comes before the shorter one it contains.
const PRICES: ReadonlyArray<{ id: string; inputPerMTok: number; readMul: number }> = [
  { id: 'claude-fable-5-1', inputPerMTok: 10, readMul: 0.025 },
  { id: 'claude-mythos-5-1', inputPerMTok: 10, readMul: 0.025 },
  { id: 'claude-fable-5', inputPerMTok: 10, readMul: 0.1 },
  { id: 'claude-mythos-5', inputPerMTok: 10, readMul: 0.1 },
  { id: 'claude-opus-5-5', inputPerMTok: 4, readMul: 0.05 },
  { id: 'claude-opus-5', inputPerMTok: 5, readMul: 0.1 },
  { id: 'claude-opus-4-8', inputPerMTok: 5, readMul: 0.1 },
  { id: 'claude-opus-4-7', inputPerMTok: 5, readMul: 0.1 },
  { id: 'claude-opus-4-6', inputPerMTok: 5, readMul: 0.1 },
  { id: 'claude-sonnet-5', inputPerMTok: 2, readMul: 0.1 },
  { id: 'claude-sonnet-4-6', inputPerMTok: 3, readMul: 0.1 },
  { id: 'claude-haiku-4-5', inputPerMTok: 1, readMul: 0.1 },
]
const WRITE_MUL: Record<CacheTtl, number> = { '5m': 1.25, '1h': 2 }

// What re-sending the cached prefix costs: read from a warm cache (a warm-up)
// or written again after it lapsed (a miss); and what the last request's own
// cache write cost. Null for a model not in PRICES.
function prefixCosts(hit: CacheHit, mode: CacheTtl): { warmUsd: number; missUsd: number; writeUsd: number } | null {
  const price = PRICES.find(one => hit.model.includes(one.id))
  if (!price) {
    return null
  }

  const perToken = price.inputPerMTok / 1_000_000
  const prefix = hit.read + hit.write + hit.input

  return {
    warmUsd: prefix * perToken * price.readMul,
    missUsd: prefix * perToken * WRITE_MUL[mode],
    writeUsd: hit.write * perToken * WRITE_MUL[mode],
  }
}

function clockText(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60

  return `${m}:${String(s).padStart(2, '0')}`
}

function tokens(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n)
}

function dollars(usd: number): string {
  if (usd > 0 && usd < 0.01) {
    return '<$0.01'
  }

  return `$${usd.toFixed(2)}`
}

function bar(filled: number, width: number): string {
  return '█'.repeat(filled) + '░'.repeat(width - filled)
}

// Cells a text takes on a terminal: East Asian wide characters take two.
function cellWidth(text: string): number {
  let width = 0
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0
    const isWide =
      (code >= 0x1100 && code <= 0x115f) ||
      (code >= 0x2e80 && code <= 0xa4cf) ||
      (code >= 0xac00 && code <= 0xd7a3) ||
      (code >= 0xf900 && code <= 0xfaff) ||
      (code >= 0xfe30 && code <= 0xfe4f) ||
      (code >= 0xff00 && code <= 0xff60) ||
      (code >= 0xffe0 && code <= 0xffe6)
    width += isWide ? 2 : 1
  }

  return width
}

type RowParts = {
  marker: string
  time: string
  miss: string | null
  price: string | null
  ttl: string
  keepWarmFull: string
  keepWarmShort: string
  warm: string | null
}

type RowFit = { miss: boolean; price: boolean; stats: boolean; barCells: number; ttl: boolean; keepWarm: boolean }

// The first row, from everything shown down to the bare minimum; each step
// gives up the next least useful part. The countdown, the warm-up button, ⓘ
// and × always stay.
const ROW_FITS: readonly RowFit[] = [
  { miss: true, price: true, stats: true, barCells: BAR_CELLS, ttl: true, keepWarm: true },
  { miss: false, price: true, stats: true, barCells: BAR_CELLS, ttl: true, keepWarm: true },
  { miss: false, price: false, stats: true, barCells: BAR_CELLS, ttl: true, keepWarm: true },
  { miss: false, price: false, stats: false, barCells: BAR_CELLS, ttl: true, keepWarm: true },
  { miss: false, price: false, stats: false, barCells: BAR_CELLS / 2, ttl: true, keepWarm: true },
  { miss: false, price: false, stats: false, barCells: BAR_CELLS / 2, ttl: false, keepWarm: true },
  { miss: false, price: false, stats: false, barCells: BAR_CELLS / 2, ttl: false, keepWarm: false },
  { miss: false, price: false, stats: false, barCells: 0, ttl: false, keepWarm: false },
]

function rowWidth(parts: RowParts, fit: RowFit): number {
  const left = cellWidth(parts.marker) + (fit.barCells > 0 ? 1 + fit.barCells : 0) + 1 + cellWidth(parts.time)
  const right = [
    fit.miss && parts.miss ? cellWidth(`${parts.miss} ·`) : 0,
    fit.price && parts.price ? cellWidth(`${parts.price} ·`) : 0,
    fit.ttl ? cellWidth(parts.ttl) : 0,
    fit.keepWarm ? cellWidth(fit.stats ? parts.keepWarmFull : parts.keepWarmShort) : 0,
    // A framed button draws as `[ label ]`.
    parts.warm ? cellWidth(parts.warm) + 4 : 0,
    1,
    1,
  ].filter(width => width > 0)

  // Each item is a gap away from the next, and the groups at least two apart.
  return left + 2 + right.reduce((sum, width) => sum + width, 0) + (right.length - 1)
}

function fitRow(columns: number, parts: RowParts): RowFit {
  return ROW_FITS.find(fit => rowWidth(parts, fit) <= columns) ?? ROW_FITS[ROW_FITS.length - 1]!
}

async function strings($: EngineInterface): Promise<Strings> {
  return STRINGS[await read($, locale)]
}

// Seconds only while they matter, in the two minutes either side of expiry;
// whole minutes otherwise, so the band changes once a minute, not every second.
const SECONDS_SHOWN_MS = 2 * MINUTE

function countdownText(left: number, s: Strings): string {
  if (left > 0) {
    return left <= SECONDS_SHOWN_MS ? clockText(left) : s.minutes(Math.ceil(left / MINUTE))
  }

  return s.ago(-left <= SECONDS_SHOWN_MS ? clockText(-left) : s.minutes(Math.floor(-left / MINUTE)))
}

type BandView = {
  left: number
  isExpired: boolean
  text: string
  cells: number
  color: string
  isNearExpiry: boolean
}

// Everything the first row shows that depends on the time. The ticker redraws
// the band only when this changes.
function bandView(hit: CacheHit, mode: CacheTtl, t: number, s: Strings): BandView {
  const total = TTL_MS[mode]
  const left = total - Math.max(0, t - hit.sentAt)
  const isExpired = left <= 0

  return {
    left,
    isExpired,
    text: countdownText(left, s),
    cells: isExpired ? 0 : Math.round(Math.min(1, left / total) * BAR_CELLS),
    color: isExpired ? 'gray' : left <= WARN_MS[mode] ? 'red' : left <= total / 3 ? 'yellow' : 'green',
    isNearExpiry: isExpired || left <= WARM_SHOWN_MS[mode],
  }
}

function isMiss(hit: CacheHit): boolean {
  return hit.gapMs !== null && hit.write >= MISS_MIN_TOKENS && hit.write > hit.read
}

function asTtl(value: unknown): CacheTtl | null {
  return value === '5m' || value === '1h' ? value : null
}

async function refreshCost($: EngineInterface, options: { isTurnStart?: boolean; isAfterResponse?: boolean } = {}) {
  const usage = await $.session.usage()
  const usd = usage.cost?.usd ?? null
  const contextPercent = usage.context.percent ?? null
  await update($, cost, prev => ({
    usd,
    turnStartUsd: options.isTurnStart ? usd : prev.turnStartUsd,
    contextPercent,
  }))

  // Usage windows are known only once a response came back.
  if (options.isAfterResponse) {
    await applyAccessDefault($, usage.rateLimits)
  }
}

// The engine's own default for the access in use, read off the usage windows
// the last response reported: none (an API key), within them, or past one.
async function applyAccessDefault($: EngineInterface, rateLimits: ReadonlyArray<{ kind: string; percentUsed: number }>) {
  if (!ACCESS_SOURCES.includes(await read($, ttlSource))) {
    return
  }

  const windows = rateLimits.filter(window => SUBSCRIPTION_WINDOWS.includes(window.kind))
  const [mode, source]: [CacheTtl, TtlSource] =
    windows.length === 0
      ? ['5m', 'api']
      : windows.some(window => window.percentUsed >= 100)
        ? ['5m', 'overage']
        : ['1h', 'default']
  await update($, ttl, () => mode)
  await update($, ttlSource, () => source)
}

// Bedrock, Vertex AI and Foundry cache for five minutes from the start.
async function isCloudProvider($: EngineInterface): Promise<boolean> {
  const flags = [
    await $.env.get('CLAUDE_CODE_USE_BEDROCK'),
    await $.env.get('CLAUDE_CODE_USE_VERTEX'),
    await $.env.get('CLAUDE_CODE_USE_FOUNDRY'),
  ]

  return flags.some(flag => flag !== undefined && flag !== '' && flag !== '0' && flag.toLowerCase() !== 'false')
}

async function setTtl($: EngineInterface, value: CacheTtl, source: TtlSource) {
  await update($, ttl, () => value)
  await update($, ttlSource, () => source)
  // A reading from hits and misses holds for this session only: overage is
  // what usually drops the TTL to 5m, and it passes.
  if (source === 'manual' || source === 'model') {
    await $.store.set(TTL_STORE_KEY, value)
  }
}

// A main-thread request after a gap between the two TTLs says which one is
// in force: a hit means the entry outlived 5 minutes, a miss that it did not.
// A TTL the person configured (variable or setting) is never second-guessed.
async function detectTtl($: EngineInterface, hit: CacheHit) {
  const gap = hit.gapMs
  const source = await read($, ttlSource)
  if (gap === null || source === 'env' || source === 'settings') {
    return
  }

  const isBetween = gap > TTL_MS['5m'] + BOUNDARY_MS && gap < TTL_MS['1h'] - BOUNDARY_MS
  if (!isBetween) {
    return
  }

  const mode = await read($, ttl)
  const s = await strings($)
  if (isMiss(hit) && mode === '1h') {
    await setTtl($, '5m', 'detected')
    $.ui.toast(s.toastTtl5m(clockText(gap)))
  } else if (hit.read > hit.write && mode === '5m') {
    await setTtl($, '1h', 'detected')
    $.ui.toast(s.toastTtl1h(clockText(gap)))
  }
}

async function recordHit($: EngineInterface, fields: Omit<CacheHit, 'gapMs'>) {
  const prev = await read($, last)
  const hit: CacheHit = { ...fields, gapMs: prev ? fields.sentAt - prev.sentAt : null }
  await update($, last, () => hit)
  await detectTtl($, hit)

  return hit
}

async function warm($: EngineInterface, options: { isAuto?: boolean } = {}) {
  const startedAt = await $.clock.now()
  if (isWarmingAt(await read($, warmingSince), startedAt)) {
    return
  }

  await update($, warmingSince, () => startedAt)
  const sentAt = startedAt
  const usdBefore = (await read($, cost)).usd
  const s = await strings($)
  let isAnswered = false

  try {
    const r = await $.model.fork({ prompt: WARM_PROMPT })

    if (r.isAnswered) {
      const hit = await recordHit($, {
        sentAt,
        read: r.usage.cache_read_input_tokens,
        write: r.usage.cache_creation_input_tokens,
        input: r.usage.input_tokens,
        output: r.usage.output_tokens,
        model: (await read($, last))?.model ?? '',
      })
      isAnswered = true
      // Keeping warm goes quietly while it hits; a miss is worth a word.
      if (!options.isAuto || hit.write > hit.read) {
        $.ui.toast(hit.read > hit.write ? s.toastWarmed(tokens(hit.read)) : s.toastWarmMissed(tokens(hit.write)))
      }
    } else if (r.reason === 'nothing-to-fork') {
      $.ui.toast(s.toastNothingToFork)
    } else if (r.reason === 'api-error') {
      $.ui.toast(s.toastApiError(r.status === null ? '' : String(r.status)))
    } else {
      $.ui.toast(s.toastWarmFailed(r.reason))
    }
  } catch (error) {
    // The engine refuses some requests outright: say so rather than nothing.
    const message = error instanceof Error ? error.message : String(error)
    $.ui.toast(s.toastWarmFailed(message))
  } finally {
    await update($, warmingSince, () => 0)
    await refreshCost($)
  }

  if (options.isAuto && isAnswered) {
    const usdAfter = (await read($, cost)).usd
    const spent = usdBefore !== null && usdAfter !== null ? Math.max(0, usdAfter - usdBefore) : 0
    await update($, keepWarm, kw => ({ ...kw, count: kw.count + 1, spentUsd: kw.spentUsd + spent }))
  }
}

async function toggleKeepWarm($: EngineInterface) {
  const t = await $.clock.now()
  // Switched on, the idle clock starts now: no request yet means no prompt
  // of the person's own to count from.
  await update($, keepWarm, kw =>
    kw.isOn ? { ...kw, isOn: false } : { ...KEEP_WARM_OFF, isOn: true, lastRealAt: Math.max(kw.lastRealAt, t) },
  )
}

// Called each second: warm the cache just before it lapses, once per entry.
// A running turn is no reason to wait: two minutes before expiry means the
// conversation has sent nothing for most of the TTL, as during a long command.
async function keepWarmTick($: EngineInterface, hit: CacheHit, mode: CacheTtl, t: number) {
  const kw = await read($, keepWarm)
  const left = hit.sentAt + TTL_MS[mode] - t
  if (!kw.isOn || left <= 0 || left > KEEP_WARM_LEAD_MS[mode] || kw.attemptedFor === hit.sentAt) {
    return
  }

  if (isWarmingAt(await read($, warmingSince), t)) {
    return
  }

  if (t - kw.lastRealAt > KEEP_WARM_MAX_IDLE_MS) {
    await update($, keepWarm, prev => ({ ...prev, isOn: false }))
    $.ui.toast((await strings($)).toastAutoWarmOff)

    return
  }

  // One try per entry: a failed warm-up is not retried every second.
  await update($, keepWarm, prev => ({ ...prev, attemptedFor: hit.sentAt }))
  await warm($, { isAuto: true })
}

// Claude Code's settings as the engine merges them; none when they can't be read.
async function readSettings($: EngineInterface): Promise<Readonly<Record<string, unknown>>> {
  try {
    return await $.settings.read()
  } catch {
    return {}
  }
}

// The band's key at the last redraw: what it showed, less the exact time.
let shownKey = ''

// Each second: redraw only when what the band shows has changed (a redraw a
// second shook the band on the desktop), warn before expiry, keep warm.
async function tick($: EngineInterface) {
  const t = await $.clock.now()
  const s = await strings($)
  const hit = await read($, last)
  const mode = await read($, ttl)
  const key = hit === null ? 'none' : JSON.stringify({ ...bandView(hit, mode, t, s), left: 0 })
  if (key !== shownKey) {
    shownKey = key
    await update($, now, () => t)
  }

  if (hit === null) {
    return
  }

  const left = hit.sentAt + TTL_MS[mode] - t
  const isKeptWarm = (await read($, keepWarm)).isOn
  if (!isKeptWarm && left > 0 && left <= WARN_MS[mode] && (await read($, warnedFor)) !== hit.sentAt) {
    await update($, warnedFor, () => hit.sentAt)
    $.ui.toast(s.toastExpiresIn(clockText(left)))
  }

  await keepWarmTick($, hit, mode, t)
}

// /cache with no argument: hide the band, or show it again. Whether it is
// hidden now.
async function toggleHidden($: EngineInterface): Promise<boolean> {
  const hidden = !(await read($, isHidden))
  await update($, isHidden, () => hidden)

  return hidden
}

async function hideBand($: EngineInterface) {
  await update($, isHidden, () => true)
}

async function toggleDetails($: EngineInterface) {
  const detailed = !(await read($, isDetailed))
  await update($, isDetailed, () => detailed)
}

// The Warm up button: a warm-up takes up to half a minute, so say it started.
async function warmFromButton($: EngineInterface) {
  $.ui.toast((await strings($)).cmdWarming)
  await warm($)
}

export const register: Register = (on, options) => {
  on('session.start', async ($, e, next) => {
    const settings = await readSettings($)
    await update($, locale, () => resolveLocale(options.language ?? 'auto', settings.language, systemLocale()))

    // What the person configured wins over what was remembered: the variable
    // first, then the setting, as the engine itself ranks them.
    const forced = asTtl(await $.env.get('CLAUDE_CODE_PROMPT_CACHE_TTL'))
    const configured = asTtl(settings.promptCacheTtl)
    const stored = asTtl(await $.store.get(TTL_STORE_KEY))
    if (forced) {
      await update($, ttl, () => forced)
      await update($, ttlSource, () => 'env')
    } else if (configured) {
      await update($, ttl, () => configured)
      await update($, ttlSource, () => 'settings')
    } else if (stored && (await read($, ttlSource)) !== 'detected') {
      // A reload keeps a reading made this session; a fresh one starts from
      // what was remembered.
      await update($, ttl, () => stored)
      await update($, ttlSource, () => 'manual')
    } else if (ACCESS_SOURCES.includes(await read($, ttlSource)) && (await isCloudProvider($))) {
      await update($, ttl, () => '5m')
      await update($, ttlSource, () => 'api')
    }

    const s = await strings($)
    await $.command.register({ name: 'cache', description: s.commandDescription })

    await refreshCost($)
    const startedAt = await $.clock.now()
    await update($, now, () => startedAt)
    $.clock.every(1000, () => void tick($))

    // A warm-up the previous load had in flight died with it.
    await update($, warmingSince, () => 0)

    return next(e)
  })

  // Every main-loop model request refreshes the cache entry it reads.
  on('turn.step', async function* ($, e, next) {
    const sentAt = await $.clock.now()
    const r = yield* next(e)

    if (!e.agentId && r.usage) {
      await update($, keepWarm, kw => ({ ...kw, lastRealAt: sentAt }))
      await recordHit($, {
        sentAt,
        read: r.usage.cache_read_input_tokens,
        write: r.usage.cache_creation_input_tokens,
        input: r.usage.input_tokens,
        output: r.usage.output_tokens,
        model: r.usage.model,
      })
    }

    // Subagent requests cost money too: the session total counts them all.
    if (r.usage) {
      await refreshCost($, { isAfterResponse: true })
    }

    return r
  })

  on('turn.start', async ($, e, next) => {
    await refreshCost($, { isTurnStart: true })

    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    await refreshCost($)

    return next(e)
  })

  // A model switch forfeits the cache and names the TTL the engine uses.
  on('classic.PostModelSwitch', async ($, e, next) => {
    const source = await read($, ttlSource)
    if (source !== 'env' && source !== 'settings') {
      await setTtl($, e.cache_ttl, 'model')
    }
    await update($, last, () => null)

    return next(e)
  })

  on('session.end', async ($, e, next) => {
    if (e.reason === 'clear') {
      await update($, last, () => null)
    }

    return next(e)
  })

  on('command.run', { command: 'cache' }, async ($, e) => {
    const arg = (e.args ?? '').trim()
    const s = await strings($)

    if (arg === '5m' || arg === '1h') {
      await setTtl($, arg, 'manual')
      await update($, isHidden, () => false)

      return { text: s.cmdTtl(arg) }
    }

    if (arg === 'warm') {
      void warm($)

      return { text: s.cmdWarming }
    }

    const hidden = await toggleHidden($)

    return { text: hidden ? s.cmdHidden : s.cmdShown }
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey || (await read($, isHidden))) {
      return next(e)
    }

    const s = await strings($)
    const hit = await read($, last)
    const t = await read($, now)
    const mode = await read($, ttl)
    const source = await read($, ttlSource)
    const warming = isWarmingAt(await read($, warmingSince), t)
    const spend = await read($, cost)
    const { Box, Button, Text } = $.ui.resolve(e)

    const ttlLabel = source === 'detected' ? s.ttlAuto(mode) : mode
    const hide = (
      <Button
        key="hide"
        label="×"
        plain
        dimColor
        role="dismiss"
        onPress={() => hideBand($)}
      />
    )

    const turnUsd =
      spend.usd !== null && spend.turnStartUsd !== null ? Math.max(0, spend.usd - spend.turnStartUsd) : null
    const costRow =
      spend.usd === null ? null : (
        <Box key="cost" flexDirection="row" gap={1}>
          <Text color="cyan">≈ {dollars(spend.usd)}</Text>
          <Text dimColor wrap="truncate-end">
            {turnUsd !== null ? `· ${s.turn(dollars(turnUsd))}` : ''}
            {spend.contextPercent !== null ? ` · ${s.context(spend.contextPercent)}` : ''}
          </Text>
        </Box>
      )

    if (hit === null) {
      return (
        <Box key="band" flexDirection="column">
          <Box flexDirection="row" justifyContent="space-between" width={e.props.bodyColumns}>
            <Text dimColor>{s.noRequests(ttlLabel)}</Text>
            {hide}
          </Box>
          {costRow}
        </Box>
      )
    }

    const view = bandView(hit, mode, t, s)
    const elapsed = Math.max(0, t - hit.sentAt)
    const isWarmShown = warming || view.isNearExpiry
    const detailed = await read($, isDetailed)
    const kw = await read($, keepWarm)
    const keepWarmShort = `${kw.isOn ? '☑' : '☐'} ${s.autoWarm}`
    const keepWarmFull = kw.isOn && kw.count > 0 ? `${keepWarmShort} (${kw.count} · ${dollars(kw.spentUsd)})` : keepWarmShort
    const costs = prefixCosts(hit, mode)
    const missText = isMiss(hit)
      ? `${s.missMarker(tokens(hit.write))}${costs ? ` ≈ ${dollars(costs.writeUsd)}` : ''}`
      : null
    // The warm-up first: its price next to a miss's is the case for pressing it.
    const priceText = costs ? s.priceShort(dollars(costs.warmUsd), dollars(costs.missUsd)) : null

    // Opened with the ⓘ button: what the last request did. A click rather than
    // a hover, since a row that comes and goes under the pointer shook the band.
    // One short line per topic, so each fits a narrow band whole.
    const details = detailed && (
      <Box flexDirection="column">
        <Text dimColor wrap="wrap">
          {s.lastRequest(countdownText(-elapsed, s), tokens(hit.read), tokens(hit.write), tokens(hit.input))}
        </Text>
        {costs && (
          <Text dimColor wrap="wrap">
            {s.priceDetail(dollars(costs.warmUsd), dollars(costs.missUsd))}
          </Text>
        )}
        <Text dimColor wrap="wrap">
          {s.ttlLine(mode, s.sources[source])}
        </Text>
      </Box>
    )

    const marker = view.isExpired ? `○ ${s.expired}` : `● ${s.cache}`
    const warmLabel = isWarmShown ? (warming ? s.warming : s.warm) : null
    const fit = fitRow(e.props.bodyColumns, {
      marker,
      time: view.text,
      miss: missText,
      price: isWarmShown ? priceText : null,
      ttl: ttlLabel,
      keepWarmFull,
      keepWarmShort,
      warm: warmLabel,
    })

    // The countdown is the left group's last element: the only text that
    // changes every second, so its width never shifts anything after it.
    // Everything else sits in the right group, anchored to the far edge.
    return (
      <Box key="band" flexDirection="column">
        <Box flexDirection="row" justifyContent="space-between" width={e.props.bodyColumns}>
          <Box flexDirection="row" gap={1}>
            <Text color={view.color} bold>
              {marker}
            </Text>
            {!view.isExpired && fit.barCells > 0 && (
              <Text color={view.color}>{bar(Math.round((view.cells / BAR_CELLS) * fit.barCells), fit.barCells)}</Text>
            )}
            <Text bold={!view.isExpired}>{view.text}</Text>
          </Box>
          <Box flexDirection="row" gap={1}>
            {fit.miss && missText && <Text color="red">{missText} ·</Text>}
            {fit.price && isWarmShown && priceText && <Text color="yellow">{priceText} ·</Text>}
            {fit.ttl && <Text dimColor>{ttlLabel}</Text>}
            {fit.keepWarm && (
              <Button
                key="keep-warm"
                label={fit.stats ? keepWarmFull : keepWarmShort}
                plain
                dimColor={!kw.isOn}
                onPress={() => toggleKeepWarm($)}
              />
            )}
            {warmLabel && (
              <Button
                key="warm"
                label={warmLabel}
                onPress={() => warmFromButton($)}
              />
            )}
            <Button
              key="details"
              label="ⓘ"
              plain
              dimColor
              onPress={() => toggleDetails($)}
            />
            {hide}
          </Box>
        </Box>
        {costRow}
        {details}
      </Box>
    )
  })
}
