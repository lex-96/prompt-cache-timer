import { expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import type { On } from 'claude-code'

import { resolveLocale } from '../hooks/i18n'

const START = 1_000_000
const MINUTE = 60_000

// The Russian band; the language itself is tested at the end.
const RU = { options: { language: 'ru' } }

const BAND_PROPS = {
  hasSurvey: false,
  isWorking: false,
  maxRows: 12,
  bodyColumns: 140,
  scroll: { offset: 0, bodyRows: 12 },
  view: {},
}

type Usage = { read: number; write: number }
const HIT: Usage = { read: 50_000, write: 1_000 }
const MISS: Usage = { read: 0, write: 51_000 }

// The engine beneath the plugin: a clock, a store, a usage report whose cost
// grows by $0.25 per model request, model requests answering with the usage
// the test queues (a cache hit when the queue is empty), and the toasts shown.
// A subscription well within its usage windows, unless a test says otherwise.
const SUBSCRIPTION = [
  { kind: 'five_hour', percentUsed: 12 },
  { kind: 'seven_day', percentUsed: 30 },
]

function world(
  on: On,
  env: Record<string, string> = {},
  settings: Record<string, unknown> = {},
  rateLimits: ReadonlyArray<{ kind: string; percentUsed: number }> = SUBSCRIPTION,
  canFork = true,
) {
  const clock = mock.clock(on, { now: START })
  mock.store(on)
  mock.env(on, env)
  on('settings.read', () => ({ value: settings }))
  let spent = 0
  const queued: Usage[] = []
  const toasts: string[] = []

  on('ui.toast', (_$, e) => {
    toasts.push(e.text)

    return { value: undefined }
  })
  on('session.usage', () => ({
    value: {
      startedAt: START,
      context: { tokens: 24_000, window: 200_000, percent: 12 },
      // Windows come with the first response, as the engine reports them.
      rateLimits: spent > 0 ? rateLimits : [],
      cost: { usd: spent },
    },
  }))
  on('command.register', (_$, e) => ({ value: { command: e.name } }))
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('turn.start', (_$, e) => ({ turnId: e.turnId }))
  on('turn.complete', (_$, e) => ({ text: e.answer }))
  on('turn.step', async function* (_$, e) {
    spent += 0.25
    const usage = queued.shift() ?? HIT

    return {
      turnId: e.turnId,
      index: e.index,
      answer: 'ok',
      toolUses: [],
      stopReason: 'end_turn' as const,
      usage: {
        input_tokens: 12,
        output_tokens: 40,
        cache_read_input_tokens: usage.read,
        cache_creation_input_tokens: usage.write,
        model: 'claude-opus-5-5',
      },
    }
  })

  // Warm-ups read the whole cached prefix and cost a cent each.
  let forks = 0
  // Without an answer beneath, the engine refuses the fork with an error.
  if (canFork) on('model.fork', () => {
    forks += 1
    spent += 0.01

    return {
      value: {
        isAnswered: true as const,
        text: 'ok',
        usage: { input_tokens: 20, output_tokens: 1, cache_read_input_tokens: 51_000, cache_creation_input_tokens: 0 },
      },
    }
  })

  return { clock, queued, toasts, forks: () => forks }
}

async function oneTurn($: Engine, turnId: string) {
  await $.turn.start({ text: 'hi', turnId })
  const stream = $.turn.step({ turnId, index: 0, model: 'claude-opus-5-5', messageCount: 1 })
  for await (const _chunk of stream) {
    // drain
  }
  await stream.result
  await $.turn.complete({ turnId, answer: 'ok', durationMs: 1000, isAborted: false, reason: 'answer' })
}

async function band($: Engine, surface: 'desktop' | 'terminal') {
  return $.ui.mount({ plugin: 'prompt-cache-timer', surface, component: 'AbovePrompt', props: BAND_PROPS })
}

for (const surface of ['desktop', 'terminal'] as const) {
  test(`compact band: timer, cost, warm-up near expiry on ${surface}`, RU, async ($, on) => {
    const { clock } = world(on)
    await $.session.start({ cwd: 'D:/source/Infra', surface, isInteractive: true })

    const before = await band($, surface)
    expect(await before.find({ text: /запросов ещё не было/ })).toBeDefined()
    // The bare figure: "at API prices" lives in the details and the README.
    expect((await before.find({ key: 'cost' }))?.text).toBe('≈ $0.00 · контекст 12%')
    await before.unmount()

    await oneTurn($, 't1')
    await clock.advance(61_000)

    const ui = await band($, surface)
    expect(await ui.find({ text: /● Кэш/ })).toBeDefined()
    // Whole minutes far from expiry, so the band redraws once a minute.
    expect(await ui.find({ text: /^59 мин$/ })).toBeDefined()
    // The last request's details open with the ⓘ button.
    expect(await ui.find({ text: /из кэша 50\.0k/ })).toBeUndefined()
    await ui.press({ key: 'details' })
    // Three short lines rather than one that a narrow band cuts off.
    expect(await ui.find({ text: /^Последний запрос .*из кэша 50\.0k · запись 1\.0k · без кэша 12$/ })).toBeDefined()
    // The warm-up's price first: next to the miss's it is the case for warming.
    expect(await ui.find({ text: /^Прогрев сейчас ≈ \$0\.01 · промах после истечения ≈ \$0\.41 \(цены API\)$/ })).toBeDefined()
    expect(await ui.find({ text: /^TTL 1h: по умолчанию для подписки · сменить/ })).toBeDefined()
    expect((await ui.find({ key: 'cost' }))?.text).toContain('$0.25')
    expect(await ui.find({ text: /ход \$0\.25/ })).toBeDefined()
    expect(await ui.find({ text: /контекст 12%/ })).toBeDefined()
    // Far from expiry there is nothing to warm up, and no miss to report.
    expect(await ui.find({ key: 'warm' })).toBeUndefined()
    expect(await ui.find({ text: /прогрев ≈ \$0\.01 · промах ≈ \$0\.41 ·$/ })).toBeUndefined()
    expect(await ui.find({ text: /промах:/ })).toBeUndefined()

    // The countdown closes the left group, so its changing width moves nothing.
    const drawn = (await ui.drawn()) as unknown as { children: Array<{ children: Array<{ children: unknown[] }> }> }
    const left = drawn.children[0]?.children[0]?.children ?? []
    expect(JSON.stringify(left[left.length - 1])).toContain('59 мин')

    // Ten minutes before the hour the warm-up button appears, priced: 51k of
    // Opus 5.5 prefix is $0.204 at $4/MTok, so a 1h rewrite is 2x that and a
    // warm read 0.05x.
    await clock.advance(49 * MINUTE + 30_000)
    expect(await ui.find({ key: 'warm' })).toBeDefined()
    expect(await ui.find({ text: /^прогрев ≈ \$0\.01 · промах ≈ \$0\.41 ·$/ })).toBeDefined()
    expect(await ui.find({ text: /^10 мин$/ })).toBeDefined()

    // Seconds come back for the last two minutes.
    await clock.advance(8 * MINUTE)
    expect(await ui.find({ text: /^1:29$/ })).toBeDefined()

    // /cache 5m: the entry is long past five minutes, so it reads as lapsed.
    await $.command.run({ command: 'cache', args: '5m' })
    expect(await ui.find({ text: /Кэш истёк/ })).toBeDefined()
    await ui.unmount()
  })
}

test('TTL is read off a miss after a pause, and off a hit after one', RU, async ($, on) => {
  const { clock, queued, toasts } = world(on)
  await $.session.start({ cwd: 'D:/source/Infra', surface: 'desktop', isInteractive: true })

  await oneTurn($, 't1')
  // Twenty minutes later the whole prefix is written again: the 1h guess was wrong.
  await clock.advance(20 * MINUTE)
  queued.push(MISS)
  await oneTurn($, 't2')

  const ui = await band($, 'desktop')
  expect(await ui.find({ text: /5m авто/ })).toBeDefined()
  // 51k written at the 5m rate it now reads as: 51k x $4/MTok x 1.25.
  expect(await ui.find({ text: /промах: перезаписано 51\.0k ≈ \$0\.2[56]/ })).toBeDefined()
  expect(toasts.some(text => /TTL сейчас 5 минут/.test(text))).toBe(true)

  // A miss right after a request says nothing about the TTL.
  await clock.advance(MINUTE)
  queued.push(MISS)
  await oneTurn($, 't3')
  expect(await ui.find({ text: /5m авто/ })).toBeDefined()

  // Overage over: twenty minutes on, the cache was still there.
  await clock.advance(20 * MINUTE)
  await oneTurn($, 't4')
  expect(await ui.find({ text: /1h авто/ })).toBeDefined()
  expect(await ui.find({ text: /промах:/ })).toBeUndefined()
  expect(toasts.some(text => /TTL 1 час/.test(text))).toBe(true)
  await ui.unmount()
})

test('CLAUDE_CODE_PROMPT_CACHE_TTL is never second-guessed', RU, async ($, on) => {
  const { clock, queued } = world(on, { CLAUDE_CODE_PROMPT_CACHE_TTL: '1h' })
  await $.session.start({ cwd: 'D:/source/Infra', surface: 'desktop', isInteractive: true })

  await oneTurn($, 't1')
  await clock.advance(20 * MINUTE)
  queued.push(MISS)
  await oneTurn($, 't2')

  const ui = await band($, 'desktop')
  expect(await ui.find({ text: /^(1h|5m) авто$/ })).toBeUndefined()
  expect(await ui.find({ text: /^1h$/ })).toBeDefined()
  await ui.unmount()
})

// A plugin beside the one under test that reports each write of the clock
// value the band draws from (each write is a redraw) as a toast, which the
// test's own toast hook collects: an inline plugin runs in an environment of
// its own and cannot reach the test's variables.
const watcher = {
  name: 'now-watcher',
  register: (on: On) => {
    on('state.set', ($, e, next) => {
      if (e.plugin === 'prompt-cache-timer' && e.key === 'now') {
        $.ui.toast('now-write')
      }

      return next(e)
    })
  },
}

test('far from expiry the band redraws once a minute, not every second', { ...RU, plugins: [watcher] }, async ($, on) => {
  const { clock, toasts } = world(on)
  const writes = () => toasts.filter(text => text === 'now-write').length
  await $.session.start({ cwd: 'D:/source/Infra', surface: 'desktop', isInteractive: true })
  await oneTurn($, 't1')
  await clock.advance(5_000)

  const before = writes()
  await clock.advance(3 * MINUTE)
  // Three minute boundaries crossed and one bar cell lost (at 57:30 left): a
  // write at each, none in between, where a ticker per second made 180.
  expect(writes() - before).toBe(4)

  // In the last two minutes every second counts.
  await clock.advance(55 * MINUTE)
  const late = writes()
  await clock.advance(10_000)
  expect(writes() - late).toBeGreaterThanOrEqual(9)
})

test('auto warm-up: warms just before expiry, quietly, and stops after 4 idle hours', { ...RU, timeoutMs: 60_000 }, async ($, on) => {
  const { clock, toasts, forks } = world(on)
  await $.session.start({ cwd: 'D:/source/Infra', surface: 'desktop', isInteractive: true })
  await oneTurn($, 't1')

  const ui = await band($, 'desktop')
  expect(await ui.find({ key: 'keep-warm', text: '☐ автопрогрев' })).toBeDefined()
  await ui.press({ key: 'keep-warm' })
  expect(await ui.find({ key: 'keep-warm', text: '☑ автопрогрев' })).toBeDefined()

  // Nothing until two minutes before the hour is up.
  await clock.advance(57 * MINUTE)
  expect(forks()).toBe(0)
  await clock.advance(90_000)
  expect(forks()).toBe(1)
  // The entry is fresh again, the switch counts what it spent, and it went
  // quietly: no "warmed" toast, no "about to lapse" warning.
  expect(await ui.find({ text: /^60 мин$/ })).toBeDefined()
  expect(await ui.find({ key: 'keep-warm', text: '☑ автопрогрев (1 · $0.01)' })).toBeDefined()
  expect(toasts.filter(text => /прогрет|истечёт/.test(text))).toEqual([])

  // Warm-ups at 58, 116, 174 and 232 minutes; the next would land past four
  // hours without a request of the person's own, so the switch turns off.
  // (The mocked clock resolves at most 10 000 waits per advance: an hour at a time.)
  for (let hour = 0; hour < 4; hour += 1) {
    await clock.advance(60 * MINUTE)
  }
  expect(forks()).toBe(4)
  expect(toasts.some(text => /Автопрогрев выключен: 4 часа/.test(text))).toBe(true)
  expect(await ui.find({ key: 'keep-warm', text: '☐ автопрогрев' })).toBeDefined()
  await ui.unmount()
})

test('promptCacheTtl in settings is the TTL, and is never second-guessed', RU, async ($, on) => {
  const { clock, queued } = world(on, {}, { promptCacheTtl: '5m' })
  await $.session.start({ cwd: 'D:/source/Infra', surface: 'desktop', isInteractive: true })
  await oneTurn($, 't1')

  const ui = await band($, 'desktop')
  expect(await ui.find({ text: /^5m$/ })).toBeDefined()
  expect(await ui.find({ text: /^5 мин$/ })).toBeDefined()

  // A hit after twenty minutes would read as 1h, but the setting stands.
  await clock.advance(20 * MINUTE)
  queued.push(HIT)
  await oneTurn($, 't2')
  expect(await ui.find({ text: /^5m$/ })).toBeDefined()
  await ui.press({ key: 'details' })
  expect(await ui.find({ text: /^TTL 5m: из настройки promptCacheTtl/ })).toBeDefined()
  await ui.unmount()
})

for (const surface of ['desktop', 'terminal'] as const) {
  test(`the band in English on ${surface}`, { options: { language: 'en' } }, async ($, on) => {
    const { clock } = world(on)
    await $.session.start({ cwd: 'D:/source/Infra', surface, isInteractive: true })
    await oneTurn($, 't1')
    await clock.advance(61_000)

    const ui = await band($, surface)
    expect(await ui.find({ text: /^● Cache$/ })).toBeDefined()
    expect(await ui.find({ text: /^59 min$/ })).toBeDefined()
    expect(await ui.find({ key: 'keep-warm', text: '☐ auto warm-up' })).toBeDefined()
    expect(await ui.find({ text: /turn \$0\.25 · context 12%/ })).toBeDefined()

    await ui.press({ key: 'details' })
    expect(await ui.find({ text: /^Warm-up now ≈ \$0\.01 · miss after expiry ≈ \$0\.41 \(API prices\)$/ })).toBeDefined()
    expect(await ui.find({ text: /^TTL 1h: subscription default · change: \/cache 5m or \/cache 1h$/ })).toBeDefined()

    await clock.advance(49 * MINUTE + 30_000)
    expect(await ui.find({ text: /^warm-up ≈ \$0\.01 · miss ≈ \$0\.41 ·$/ })).toBeDefined()
    expect(await ui.find({ key: 'warm', text: 'Warm up' })).toBeDefined()
    await ui.unmount()
  })
}

test("auto follows Claude Code's language setting", async ($, on) => {
  world(on, {}, { language: 'japanese' })
  await $.session.start({ cwd: 'D:/source/Infra', surface: 'desktop', isInteractive: true })
  await oneTurn($, 't1')

  const ui = await band($, 'desktop')
  expect(await ui.find({ text: /^60分$/ })).toBeDefined()
  expect(await ui.find({ key: 'keep-warm', text: '☐ 自動ウォームアップ' })).toBeDefined()
  await ui.unmount()
})

test('the mod option wins over the setting', { options: { language: 'de' } }, async ($, on) => {
  world(on, {}, { language: 'russian' })
  await $.session.start({ cwd: 'D:/source/Infra', surface: 'desktop', isInteractive: true })
  await oneTurn($, 't1')

  const ui = await band($, 'desktop')
  expect(await ui.find({ text: /^60 Min\.$/ })).toBeDefined()
  await ui.unmount()
})

test('which language: option, then setting, then system, then English', () => {
  // The option, unless auto.
  expect(resolveLocale('uk', 'russian', 'en-US')).toBe('uk')
  // The setting, by English name, native name or code.
  expect(resolveLocale('auto', 'Russian', 'en-US')).toBe('ru')
  expect(resolveLocale('auto', 'Español', 'en-US')).toBe('es')
  expect(resolveLocale('auto', '日本語', 'en-US')).toBe('ja')
  expect(resolveLocale('auto', 'pt-BR', 'en-US')).toBe('pt')
  // Then the system locale.
  expect(resolveLocale('auto', undefined, 'ru-RU')).toBe('ru')
  expect(resolveLocale('auto', '', 'zh-Hans-CN')).toBe('zh')
  expect(resolveLocale('auto', 'klingon', 'ko_KR')).toBe('ko')
  // English when nothing matches.
  expect(resolveLocale('auto', 'klingon', 'tlh')).toBe('en')
  expect(resolveLocale(undefined, undefined, null)).toBe('en')
})

test('an API key caches for five minutes: no usage windows after the first response', RU, async ($, on) => {
  world(on, {}, {}, [])
  await $.session.start({ cwd: 'D:/source/Infra', surface: 'desktop', isInteractive: true })

  const ui = await band($, 'desktop')
  expect(await ui.find({ text: /^Кэш: запросов ещё не было · 1h$/ })).toBeDefined()
  await oneTurn($, 't1')
  expect(await ui.find({ text: /^5m$/ })).toBeDefined()
  expect(await ui.find({ text: /^5 мин$/ })).toBeDefined()
  await ui.press({ key: 'details' })
  expect(await ui.find({ text: /^TTL 5m: по умолчанию для API-ключа и облачных провайдеров/ })).toBeDefined()
  await ui.unmount()
})

test('a subscription past a usage window caches for five minutes', RU, async ($, on) => {
  world(on, {}, {}, [
    { kind: 'five_hour', percentUsed: 100 },
    { kind: 'seven_day', percentUsed: 64 },
  ])
  await $.session.start({ cwd: 'D:/source/Infra', surface: 'desktop', isInteractive: true })
  await oneTurn($, 't1')

  const ui = await band($, 'desktop')
  expect(await ui.find({ text: /^5m$/ })).toBeDefined()
  await ui.press({ key: 'details' })
  expect(await ui.find({ text: /^TTL 5m: подписка сверх лимитов/ })).toBeDefined()
  await ui.unmount()
})

test('Bedrock caches for five minutes from the start', RU, async ($, on) => {
  world(on, { CLAUDE_CODE_USE_BEDROCK: '1' }, {}, [])
  await $.session.start({ cwd: 'D:/source/Infra', surface: 'desktop', isInteractive: true })

  const ui = await band($, 'desktop')
  expect(await ui.find({ text: /^Кэш: запросов ещё не было · 5m$/ })).toBeDefined()
  await ui.unmount()
})

test('a /cache choice outranks the access default', RU, async ($, on) => {
  world(on, {}, {}, [])
  await $.session.start({ cwd: 'D:/source/Infra', surface: 'desktop', isInteractive: true })
  await $.command.run({ command: 'cache', args: '1h' })
  await oneTurn($, 't1')

  const ui = await band($, 'desktop')
  expect(await ui.find({ text: /^1h$/ })).toBeDefined()
  await ui.unmount()
})

// Near expiry, with everything to show, at three widths.
async function nearExpiry($: Engine, on: On, columns: number) {
  const { clock } = world(on)
  await $.session.start({ cwd: 'D:/source/Infra', surface: 'terminal', isInteractive: true })
  await oneTurn($, 't1')
  await clock.advance(51 * MINUTE)

  return $.ui.mount({
    plugin: 'prompt-cache-timer',
    surface: 'terminal',
    component: 'AbovePrompt',
    props: { ...BAND_PROPS, bodyColumns: columns },
  })
}

test('a wide band shows everything near expiry', RU, async ($, on) => {
  const ui = await nearExpiry($, on, 140)
  expect(await ui.find({ text: /^прогрев ≈ \$0\.01 · промах ≈ \$0\.41 ·$/ })).toBeDefined()
  expect(await ui.find({ text: /^1h$/ })).toBeDefined()
  expect(await ui.find({ key: 'keep-warm' })).toBeDefined()
  expect(await ui.find({ text: /^█+░*$/ })).toBeDefined()
  await ui.unmount()
})

test('at 60 columns the prices go first', RU, async ($, on) => {
  const ui = await nearExpiry($, on, 60)
  expect(await ui.find({ text: /прогрев ≈/ })).toBeUndefined()
  expect(await ui.find({ text: /^[█░]{12}$/ })).toBeDefined()
  expect(await ui.find({ key: 'keep-warm' })).toBeDefined()
  await ui.unmount()
})

test('at 55 columns the bar halves too', RU, async ($, on) => {
  const ui = await nearExpiry($, on, 55)
  expect(await ui.find({ text: /прогрев ≈/ })).toBeUndefined()
  expect(await ui.find({ text: /^[█░]{6}$/ })).toBeDefined()
  expect(await ui.find({ key: 'keep-warm' })).toBeDefined()
  expect(await ui.find({ key: 'warm' })).toBeDefined()
  expect(await ui.find({ text: /^9 мин$/ })).toBeDefined()
  await ui.unmount()
})

test('at 40 columns only the countdown and the controls stay', RU, async ($, on) => {
  const ui = await nearExpiry($, on, 40)
  expect(await ui.find({ key: 'keep-warm' })).toBeUndefined()
  expect(await ui.find({ text: /^1h$/ })).toBeUndefined()
  expect(await ui.find({ key: 'warm' })).toBeDefined()
  expect(await ui.find({ key: 'details' })).toBeDefined()
  expect(await ui.find({ key: 'hide' })).toBeDefined()
  expect(await ui.find({ text: /^9 мин$/ })).toBeDefined()
  await ui.unmount()
})

test('Warm up says it started, and warms', RU, async ($, on) => {
  const { clock, toasts, forks } = world(on)
  await $.session.start({ cwd: 'D:/source/Infra', surface: 'desktop', isInteractive: true })
  await oneTurn($, 't1')
  await clock.advance(55 * MINUTE)

  const ui = await band($, 'desktop')
  await ui.press({ key: 'warm' })
  expect(forks()).toBe(1)
  // "Warming…" right away, "warmed" once the answer came back.
  const started = toasts.indexOf('Prompt Cache Timer: прогреваю кэш…')
  const warmed = toasts.findIndex(text => /^Кэш прогрет: прочитано 51\.0k/.test(text))
  expect(started).toBeGreaterThanOrEqual(0)
  expect(warmed).toBeGreaterThan(started)
  expect(await ui.find({ text: /^60 мин$/ })).toBeDefined()
  await ui.unmount()
})

test('a warm-up the engine refuses says why instead of nothing', RU, async ($, on) => {
  const { clock, toasts } = world(on, {}, {}, SUBSCRIPTION, false)
  await $.session.start({ cwd: 'D:/source/Infra', surface: 'desktop', isInteractive: true })
  await oneTurn($, 't1')
  await clock.advance(55 * MINUTE)

  const ui = await band($, 'desktop')
  await ui.press({ key: 'warm' })
  expect(toasts.some(text => /^Прогрев не удался: .+/.test(text))).toBe(true)
  // Nothing is left marked as warming: the button is ready again.
  expect(await ui.find({ key: 'warm', text: 'Прогреть' })).toBeDefined()
  await ui.unmount()
})

test('auto warm-up also warms during a long turn with no requests', { ...RU, timeoutMs: 30_000 }, async ($, on) => {
  const { clock, forks } = world(on)
  await $.session.start({ cwd: 'D:/source/Infra', surface: 'desktop', isInteractive: true })
  await oneTurn($, 't1')

  const ui = await band($, 'desktop')
  await ui.press({ key: 'keep-warm' })
  // A turn starts and runs an hour-long command: no request to the model.
  await $.turn.start({ text: 'build', turnId: 't2' })
  await clock.advance(58 * MINUTE + 30_000)
  expect(forks()).toBe(1)
  await ui.unmount()
})
