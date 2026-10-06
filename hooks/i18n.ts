import type { Locale, TtlSource } from '../types'

export const LOCALES: readonly Locale[] = ['en', 'ru', 'uk', 'de', 'fr', 'es', 'pt', 'it', 'ja', 'zh', 'ko']

// Every word the band, its toasts and its command say. Functions where a
// value goes in, since word order differs between languages.
export type Strings = {
  cache: string
  expired: string
  noRequests: (ttl: string) => string
  minutes: (n: number) => string
  ago: (span: string) => string
  ttlAuto: (mode: string) => string
  missMarker: (tokens: string) => string
  priceShort: (warm: string, miss: string) => string
  warm: string
  warming: string
  autoWarm: string
  turn: (usd: string) => string
  context: (percent: number) => string
  lastRequest: (ago: string, read: string, write: string, input: string) => string
  priceDetail: (warm: string, miss: string) => string
  ttlLine: (mode: string, source: string) => string
  sources: Record<TtlSource, string>
  toastWarmed: (tokens: string) => string
  toastWarmMissed: (tokens: string) => string
  toastNothingToFork: string
  toastApiError: (status: string) => string
  toastWarmFailed: (reason: string) => string
  toastExpiresIn: (clock: string) => string
  toastTtl5m: (gap: string) => string
  toastTtl1h: (gap: string) => string
  toastAutoWarmOff: string
  cmdTtl: (mode: string) => string
  cmdWarming: string
  cmdHidden: string
  cmdShown: string
  commandDescription: string
}

export const STRINGS: Record<Locale, Strings> = {
  en: {
    cache: 'Cache',
    expired: 'Cache expired',
    noRequests: ttl => `Cache: no requests yet · ${ttl}`,
    minutes: n => `${n} min`,
    ago: span => `${span} ago`,
    ttlAuto: mode => `${mode} auto`,
    missMarker: tokens => `miss: rewrote ${tokens}`,
    priceShort: (warm, miss) => `warm-up ≈ ${warm} · miss ≈ ${miss}`,
    warm: 'Warm up',
    warming: 'Warming…',
    autoWarm: 'auto warm-up',
    turn: usd => `turn ${usd}`,
    context: percent => `context ${percent}%`,
    lastRequest: (ago, read, write, input) =>
      `Last request ${ago}: read from cache ${read} · written ${write} · uncached ${input}`,
    priceDetail: (warm, miss) => `Warm-up now ≈ ${warm} · miss after expiry ≈ ${miss} (API prices)`,
    ttlLine: (mode, source) => `TTL ${mode}: ${source} · change: /cache 5m or /cache 1h`,
    sources: {
      detected: 'detected from cache hits and misses',
      env: 'from CLAUDE_CODE_PROMPT_CACHE_TTL',
      settings: 'from the promptCacheTtl setting',
      model: 'from the model switch',
      manual: 'set with /cache',
      default: 'subscription default',
      overage: 'subscription over its usage limits',
      api: 'default for API keys and cloud providers',
    },
    toastWarmed: tokens => `Cache warmed: ${tokens} tokens read from cache`,
    toastWarmMissed: tokens => `Cache had already expired: ${tokens} tokens written again`,
    toastNothingToFork: 'Nothing to warm up: no model response in this session yet',
    toastApiError: status => `Warm-up failed: API error ${status}`.trim(),
    toastWarmFailed: reason => `Warm-up failed: ${reason}`,
    toastExpiresIn: clock => `Prompt cache expires in ${clock}`,
    toastTtl5m: gap => `Cache didn't last ${gap}: the TTL looks like 5 minutes now. Timer switched to 5m`,
    toastTtl1h: gap => `Cache lasted ${gap}: the TTL is 1 hour. Timer switched to 1h`,
    toastAutoWarmOff: 'Auto warm-up turned off: 4 hours without your requests',
    cmdTtl: mode => `Prompt Cache Timer: cache TTL = ${mode}`,
    cmdWarming: 'Prompt Cache Timer: warming the cache…',
    cmdHidden: 'Prompt Cache Timer: band hidden (/cache brings it back)',
    cmdShown: 'Prompt Cache Timer: band shown',
    commandDescription: 'Prompt Cache Timer: show or hide the prompt-cache band (args: 5m, 1h, warm)',
  },
  ru: {
    cache: 'Кэш',
    expired: 'Кэш истёк',
    noRequests: ttl => `Кэш: запросов ещё не было · ${ttl}`,
    minutes: n => `${n} мин`,
    ago: span => `${span} назад`,
    ttlAuto: mode => `${mode} авто`,
    missMarker: tokens => `промах: перезаписано ${tokens}`,
    priceShort: (warm, miss) => `прогрев ≈ ${warm} · промах ≈ ${miss}`,
    warm: 'Прогреть',
    warming: 'Прогрев…',
    autoWarm: 'автопрогрев',
    turn: usd => `ход ${usd}`,
    context: percent => `контекст ${percent}%`,
    lastRequest: (ago, read, write, input) =>
      `Последний запрос ${ago}: из кэша ${read} · запись ${write} · без кэша ${input}`,
    priceDetail: (warm, miss) => `Прогрев сейчас ≈ ${warm} · промах после истечения ≈ ${miss} (цены API)`,
    ttlLine: (mode, source) => `TTL ${mode}: ${source} · сменить: /cache 5m или /cache 1h`,
    sources: {
      detected: 'определён по попаданиям и промахам',
      env: 'из CLAUDE_CODE_PROMPT_CACHE_TTL',
      settings: 'из настройки promptCacheTtl',
      model: 'по смене модели',
      manual: 'задан через /cache',
      default: 'по умолчанию для подписки',
      overage: 'подписка сверх лимитов',
      api: 'по умолчанию для API-ключа и облачных провайдеров',
    },
    toastWarmed: tokens => `Кэш прогрет: прочитано ${tokens} токенов из кэша`,
    toastWarmMissed: tokens => `Кэш уже истёк: записано заново ${tokens} токенов`,
    toastNothingToFork: 'Нечего прогревать: в сессии ещё не было ответа модели',
    toastApiError: status => `Прогрев не удался: ошибка API ${status}`.trim(),
    toastWarmFailed: reason => `Прогрев не удался: ${reason}`,
    toastExpiresIn: clock => `Кэш промпта истечёт через ${clock}`,
    toastTtl5m: gap => `Кэш не дожил до ${gap}: похоже, TTL сейчас 5 минут. Таймер переключён на 5m`,
    toastTtl1h: gap => `Кэш пережил ${gap}: TTL 1 час. Таймер переключён на 1h`,
    toastAutoWarmOff: 'Автопрогрев выключен: 4 часа без ваших запросов',
    cmdTtl: mode => `Prompt Cache Timer: TTL кэша = ${mode}`,
    cmdWarming: 'Prompt Cache Timer: прогреваю кэш…',
    cmdHidden: 'Prompt Cache Timer: полоса скрыта (/cache — вернуть)',
    cmdShown: 'Prompt Cache Timer: полоса показана',
    commandDescription: 'Prompt Cache Timer: показать или скрыть полосу кэша промпта (аргументы: 5m, 1h, warm)',
  },
  uk: {
    cache: 'Кеш',
    expired: 'Кеш сплив',
    noRequests: ttl => `Кеш: запитів ще не було · ${ttl}`,
    minutes: n => `${n} хв`,
    ago: span => `${span} тому`,
    ttlAuto: mode => `${mode} авто`,
    missMarker: tokens => `промах: перезаписано ${tokens}`,
    priceShort: (warm, miss) => `прогрів ≈ ${warm} · промах ≈ ${miss}`,
    warm: 'Прогріти',
    warming: 'Прогрів…',
    autoWarm: 'автопрогрів',
    turn: usd => `хід ${usd}`,
    context: percent => `контекст ${percent}%`,
    lastRequest: (ago, read, write, input) =>
      `Останній запит ${ago}: з кешу ${read} · запис ${write} · без кешу ${input}`,
    priceDetail: (warm, miss) => `Прогрів зараз ≈ ${warm} · промах після спливання ≈ ${miss} (ціни API)`,
    ttlLine: (mode, source) => `TTL ${mode}: ${source} · змінити: /cache 5m або /cache 1h`,
    sources: {
      detected: 'визначено за влученнями та промахами',
      env: 'з CLAUDE_CODE_PROMPT_CACHE_TTL',
      settings: 'з налаштування promptCacheTtl',
      model: 'за зміною моделі',
      manual: 'задано через /cache',
      default: 'типово для підписки',
      overage: 'підписка понад ліміти',
      api: 'типово для API-ключа та хмарних провайдерів',
    },
    toastWarmed: tokens => `Кеш прогріто: прочитано ${tokens} токенів з кешу`,
    toastWarmMissed: tokens => `Кеш уже сплив: записано заново ${tokens} токенів`,
    toastNothingToFork: 'Нічого прогрівати: у сесії ще не було відповіді моделі',
    toastApiError: status => `Прогрів не вдався: помилка API ${status}`.trim(),
    toastWarmFailed: reason => `Прогрів не вдався: ${reason}`,
    toastExpiresIn: clock => `Кеш промпту спливе через ${clock}`,
    toastTtl5m: gap => `Кеш не протримався ${gap}: схоже, TTL зараз 5 хвилин. Таймер перемкнено на 5m`,
    toastTtl1h: gap => `Кеш протримався ${gap}: TTL 1 година. Таймер перемкнено на 1h`,
    toastAutoWarmOff: 'Автопрогрів вимкнено: 4 години без ваших запитів',
    cmdTtl: mode => `Prompt Cache Timer: TTL кешу = ${mode}`,
    cmdWarming: 'Prompt Cache Timer: прогріваю кеш…',
    cmdHidden: 'Prompt Cache Timer: смугу приховано (/cache — повернути)',
    cmdShown: 'Prompt Cache Timer: смугу показано',
    commandDescription: 'Prompt Cache Timer: показати або приховати смугу кешу промпту (аргументи: 5m, 1h, warm)',
  },
  de: {
    cache: 'Cache',
    expired: 'Cache abgelaufen',
    noRequests: ttl => `Cache: noch keine Anfragen · ${ttl}`,
    minutes: n => `${n} Min.`,
    ago: span => `vor ${span}`,
    ttlAuto: mode => `${mode} auto`,
    missMarker: tokens => `Miss: ${tokens} neu geschrieben`,
    priceShort: (warm, miss) => `Aufwärmen ≈ ${warm} · Miss ≈ ${miss}`,
    warm: 'Aufwärmen',
    warming: 'Wärmt auf…',
    autoWarm: 'Auto-Aufwärmen',
    turn: usd => `Runde ${usd}`,
    context: percent => `Kontext ${percent} %`,
    lastRequest: (ago, read, write, input) =>
      `Letzte Anfrage ${ago}: aus dem Cache ${read} · geschrieben ${write} · ohne Cache ${input}`,
    priceDetail: (warm, miss) => `Jetzt aufwärmen ≈ ${warm} · Miss nach Ablauf ≈ ${miss} (API-Preise)`,
    ttlLine: (mode, source) => `TTL ${mode}: ${source} · ändern: /cache 5m oder /cache 1h`,
    sources: {
      detected: 'aus Cache-Treffern und -Misses erkannt',
      env: 'aus CLAUDE_CODE_PROMPT_CACHE_TTL',
      settings: 'aus der Einstellung promptCacheTtl',
      model: 'durch den Modellwechsel',
      manual: 'per /cache gesetzt',
      default: 'Standard für Abos',
      overage: 'Abo über seinen Nutzungslimits',
      api: 'Standard für API-Schlüssel und Cloud-Anbieter',
    },
    toastWarmed: tokens => `Cache aufgewärmt: ${tokens} Tokens aus dem Cache gelesen`,
    toastWarmMissed: tokens => `Cache war schon abgelaufen: ${tokens} Tokens neu geschrieben`,
    toastNothingToFork: 'Nichts aufzuwärmen: noch keine Modellantwort in dieser Sitzung',
    toastApiError: status => `Aufwärmen fehlgeschlagen: API-Fehler ${status}`.trim(),
    toastWarmFailed: reason => `Aufwärmen fehlgeschlagen: ${reason}`,
    toastExpiresIn: clock => `Prompt-Cache läuft in ${clock} ab`,
    toastTtl5m: gap => `Cache hat ${gap} nicht überdauert: Die TTL scheint jetzt 5 Minuten zu sein. Timer auf 5m umgestellt`,
    toastTtl1h: gap => `Cache hat ${gap} überdauert: Die TTL ist 1 Stunde. Timer auf 1h umgestellt`,
    toastAutoWarmOff: 'Auto-Aufwärmen ausgeschaltet: 4 Stunden ohne Ihre Anfragen',
    cmdTtl: mode => `Prompt Cache Timer: Cache-TTL = ${mode}`,
    cmdWarming: 'Prompt Cache Timer: Cache wird aufgewärmt…',
    cmdHidden: 'Prompt Cache Timer: Leiste ausgeblendet (/cache blendet sie wieder ein)',
    cmdShown: 'Prompt Cache Timer: Leiste eingeblendet',
    commandDescription: 'Prompt Cache Timer: Prompt-Cache-Leiste ein- oder ausblenden (Argumente: 5m, 1h, warm)',
  },
  fr: {
    cache: 'Cache',
    expired: 'Cache expiré',
    noRequests: ttl => `Cache : aucune requête pour l’instant · ${ttl}`,
    minutes: n => `${n} min`,
    ago: span => `il y a ${span}`,
    ttlAuto: mode => `${mode} auto`,
    missMarker: tokens => `raté : ${tokens} réécrits`,
    priceShort: (warm, miss) => `préchauffage ≈ ${warm} · raté ≈ ${miss}`,
    warm: 'Préchauffer',
    warming: 'Préchauffage…',
    autoWarm: 'préchauffage auto',
    turn: usd => `tour ${usd}`,
    context: percent => `contexte ${percent} %`,
    lastRequest: (ago, read, write, input) =>
      `Dernière requête ${ago} : lus du cache ${read} · écrits ${write} · hors cache ${input}`,
    priceDetail: (warm, miss) => `Préchauffer maintenant ≈ ${warm} · raté après expiration ≈ ${miss} (prix de l’API)`,
    ttlLine: (mode, source) => `TTL ${mode} : ${source} · changer : /cache 5m ou /cache 1h`,
    sources: {
      detected: 'déduit des succès et ratés du cache',
      env: 'depuis CLAUDE_CODE_PROMPT_CACHE_TTL',
      settings: 'depuis le réglage promptCacheTtl',
      model: 'au changement de modèle',
      manual: 'défini via /cache',
      default: 'par défaut pour l’abonnement',
      overage: 'abonnement au-delà de ses limites',
      api: 'par défaut pour les clés API et les fournisseurs cloud',
    },
    toastWarmed: tokens => `Cache préchauffé : ${tokens} tokens lus depuis le cache`,
    toastWarmMissed: tokens => `Le cache avait déjà expiré : ${tokens} tokens réécrits`,
    toastNothingToFork: 'Rien à préchauffer : aucune réponse du modèle dans cette session',
    toastApiError: status => `Échec du préchauffage : erreur de l’API ${status}`.trim(),
    toastWarmFailed: reason => `Échec du préchauffage : ${reason}`,
    toastExpiresIn: clock => `Le cache du prompt expire dans ${clock}`,
    toastTtl5m: gap => `Le cache n’a pas tenu ${gap} : le TTL semble être de 5 minutes. Minuteur passé à 5m`,
    toastTtl1h: gap => `Le cache a tenu ${gap} : le TTL est d’une heure. Minuteur passé à 1h`,
    toastAutoWarmOff: 'Préchauffage auto désactivé : 4 heures sans vos requêtes',
    cmdTtl: mode => `Prompt Cache Timer : TTL du cache = ${mode}`,
    cmdWarming: 'Prompt Cache Timer : préchauffage du cache…',
    cmdHidden: 'Prompt Cache Timer : barre masquée (/cache pour la réafficher)',
    cmdShown: 'Prompt Cache Timer : barre affichée',
    commandDescription: 'Prompt Cache Timer : afficher ou masquer la barre du cache du prompt (arguments : 5m, 1h, warm)',
  },
  es: {
    cache: 'Caché',
    expired: 'Caché expirada',
    noRequests: ttl => `Caché: aún no hay solicitudes · ${ttl}`,
    minutes: n => `${n} min`,
    ago: span => `hace ${span}`,
    ttlAuto: mode => `${mode} auto`,
    missMarker: tokens => `fallo: reescritos ${tokens}`,
    priceShort: (warm, miss) => `precalentar ≈ ${warm} · fallo ≈ ${miss}`,
    warm: 'Precalentar',
    warming: 'Precalentando…',
    autoWarm: 'precalentado auto',
    turn: usd => `turno ${usd}`,
    context: percent => `contexto ${percent} %`,
    lastRequest: (ago, read, write, input) =>
      `Última solicitud ${ago}: leídos de la caché ${read} · escritos ${write} · sin caché ${input}`,
    priceDetail: (warm, miss) => `Precalentar ahora ≈ ${warm} · fallo tras expirar ≈ ${miss} (precios de la API)`,
    ttlLine: (mode, source) => `TTL ${mode}: ${source} · cambiar: /cache 5m o /cache 1h`,
    sources: {
      detected: 'detectado por aciertos y fallos de la caché',
      env: 'de CLAUDE_CODE_PROMPT_CACHE_TTL',
      settings: 'del ajuste promptCacheTtl',
      model: 'por el cambio de modelo',
      manual: 'fijado con /cache',
      default: 'predeterminado de la suscripción',
      overage: 'suscripción por encima de sus límites',
      api: 'predeterminado para claves de API y proveedores en la nube',
    },
    toastWarmed: tokens => `Caché precalentada: ${tokens} tokens leídos de la caché`,
    toastWarmMissed: tokens => `La caché ya había expirado: ${tokens} tokens escritos de nuevo`,
    toastNothingToFork: 'Nada que precalentar: aún no hay respuesta del modelo en esta sesión',
    toastApiError: status => `No se pudo precalentar: error de la API ${status}`.trim(),
    toastWarmFailed: reason => `No se pudo precalentar: ${reason}`,
    toastExpiresIn: clock => `La caché del prompt expira en ${clock}`,
    toastTtl5m: gap => `La caché no aguantó ${gap}: el TTL parece ser de 5 minutos. Temporizador cambiado a 5m`,
    toastTtl1h: gap => `La caché aguantó ${gap}: el TTL es de 1 hora. Temporizador cambiado a 1h`,
    toastAutoWarmOff: 'Precalentado auto desactivado: 4 horas sin solicitudes tuyas',
    cmdTtl: mode => `Prompt Cache Timer: TTL de la caché = ${mode}`,
    cmdWarming: 'Prompt Cache Timer: precalentando la caché…',
    cmdHidden: 'Prompt Cache Timer: barra oculta (/cache la vuelve a mostrar)',
    cmdShown: 'Prompt Cache Timer: barra visible',
    commandDescription: 'Prompt Cache Timer: mostrar u ocultar la barra de la caché del prompt (argumentos: 5m, 1h, warm)',
  },
  pt: {
    cache: 'Cache',
    expired: 'Cache expirado',
    noRequests: ttl => `Cache: nenhuma solicitação ainda · ${ttl}`,
    minutes: n => `${n} min`,
    ago: span => `há ${span}`,
    ttlAuto: mode => `${mode} auto`,
    missMarker: tokens => `falha: ${tokens} regravados`,
    priceShort: (warm, miss) => `aquecer ≈ ${warm} · falha ≈ ${miss}`,
    warm: 'Aquecer',
    warming: 'Aquecendo…',
    autoWarm: 'aquecimento auto',
    turn: usd => `turno ${usd}`,
    context: percent => `contexto ${percent}%`,
    lastRequest: (ago, read, write, input) =>
      `Última solicitação ${ago}: lidos do cache ${read} · gravados ${write} · sem cache ${input}`,
    priceDetail: (warm, miss) => `Aquecer agora ≈ ${warm} · falha após expirar ≈ ${miss} (preços da API)`,
    ttlLine: (mode, source) => `TTL ${mode}: ${source} · alterar: /cache 5m ou /cache 1h`,
    sources: {
      detected: 'detectado por acertos e falhas do cache',
      env: 'de CLAUDE_CODE_PROMPT_CACHE_TTL',
      settings: 'da configuração promptCacheTtl',
      model: 'pela troca de modelo',
      manual: 'definido com /cache',
      default: 'padrão da assinatura',
      overage: 'assinatura acima dos limites de uso',
      api: 'padrão para chaves de API e provedores de nuvem',
    },
    toastWarmed: tokens => `Cache aquecido: ${tokens} tokens lidos do cache`,
    toastWarmMissed: tokens => `O cache já tinha expirado: ${tokens} tokens gravados de novo`,
    toastNothingToFork: 'Nada para aquecer: ainda não houve resposta do modelo nesta sessão',
    toastApiError: status => `Falha ao aquecer: erro da API ${status}`.trim(),
    toastWarmFailed: reason => `Falha ao aquecer: ${reason}`,
    toastExpiresIn: clock => `O cache do prompt expira em ${clock}`,
    toastTtl5m: gap => `O cache não durou ${gap}: o TTL parece ser de 5 minutos agora. Timer alterado para 5m`,
    toastTtl1h: gap => `O cache durou ${gap}: o TTL é de 1 hora. Timer alterado para 1h`,
    toastAutoWarmOff: 'Aquecimento auto desligado: 4 horas sem solicitações suas',
    cmdTtl: mode => `Prompt Cache Timer: TTL do cache = ${mode}`,
    cmdWarming: 'Prompt Cache Timer: aquecendo o cache…',
    cmdHidden: 'Prompt Cache Timer: barra oculta (/cache para mostrar de novo)',
    cmdShown: 'Prompt Cache Timer: barra visível',
    commandDescription: 'Prompt Cache Timer: mostrar ou ocultar a barra do cache do prompt (argumentos: 5m, 1h, warm)',
  },
  it: {
    cache: 'Cache',
    expired: 'Cache scaduta',
    noRequests: ttl => `Cache: ancora nessuna richiesta · ${ttl}`,
    minutes: n => `${n} min`,
    ago: span => `${span} fa`,
    ttlAuto: mode => `${mode} auto`,
    missMarker: tokens => `miss: riscritti ${tokens}`,
    priceShort: (warm, miss) => `riscaldamento ≈ ${warm} · miss ≈ ${miss}`,
    warm: 'Riscalda',
    warming: 'Riscaldamento…',
    autoWarm: 'riscaldamento auto',
    turn: usd => `turno ${usd}`,
    context: percent => `contesto ${percent}%`,
    lastRequest: (ago, read, write, input) =>
      `Ultima richiesta ${ago}: letti dalla cache ${read} · scritti ${write} · fuori cache ${input}`,
    priceDetail: (warm, miss) => `Riscaldare ora ≈ ${warm} · miss dopo la scadenza ≈ ${miss} (prezzi API)`,
    ttlLine: (mode, source) => `TTL ${mode}: ${source} · cambia: /cache 5m o /cache 1h`,
    sources: {
      detected: 'rilevato da hit e miss della cache',
      env: 'da CLAUDE_CODE_PROMPT_CACHE_TTL',
      settings: 'dall’impostazione promptCacheTtl',
      model: 'dal cambio di modello',
      manual: 'impostato con /cache',
      default: 'predefinito dell’abbonamento',
      overage: 'abbonamento oltre i limiti di utilizzo',
      api: 'predefinito per chiavi API e provider cloud',
    },
    toastWarmed: tokens => `Cache riscaldata: ${tokens} token letti dalla cache`,
    toastWarmMissed: tokens => `La cache era già scaduta: ${tokens} token riscritti`,
    toastNothingToFork: 'Niente da riscaldare: ancora nessuna risposta del modello in questa sessione',
    toastApiError: status => `Riscaldamento non riuscito: errore API ${status}`.trim(),
    toastWarmFailed: reason => `Riscaldamento non riuscito: ${reason}`,
    toastExpiresIn: clock => `La cache del prompt scade tra ${clock}`,
    toastTtl5m: gap => `La cache non è durata ${gap}: il TTL sembra di 5 minuti. Timer passato a 5m`,
    toastTtl1h: gap => `La cache è durata ${gap}: il TTL è di 1 ora. Timer passato a 1h`,
    toastAutoWarmOff: 'Riscaldamento auto disattivato: 4 ore senza tue richieste',
    cmdTtl: mode => `Prompt Cache Timer: TTL della cache = ${mode}`,
    cmdWarming: 'Prompt Cache Timer: riscaldo la cache…',
    cmdHidden: 'Prompt Cache Timer: barra nascosta (/cache per mostrarla)',
    cmdShown: 'Prompt Cache Timer: barra visibile',
    commandDescription: 'Prompt Cache Timer: mostra o nascondi la barra della cache del prompt (argomenti: 5m, 1h, warm)',
  },
  ja: {
    cache: 'キャッシュ',
    expired: 'キャッシュ期限切れ',
    noRequests: ttl => `キャッシュ: まだリクエストなし · ${ttl}`,
    minutes: n => `${n}分`,
    ago: span => `${span}前`,
    ttlAuto: mode => `${mode} 自動`,
    missMarker: tokens => `ミス: ${tokens} を再書き込み`,
    priceShort: (warm, miss) => `ウォームアップ ≈ ${warm} · ミス ≈ ${miss}`,
    warm: 'ウォームアップ',
    warming: 'ウォームアップ中…',
    autoWarm: '自動ウォームアップ',
    turn: usd => `ターン ${usd}`,
    context: percent => `コンテキスト ${percent}%`,
    lastRequest: (ago, read, write, input) =>
      `最後のリクエスト ${ago}: キャッシュ読み取り ${read} · 書き込み ${write} · キャッシュなし ${input}`,
    priceDetail: (warm, miss) => `今ウォームアップ ≈ ${warm} · 期限切れ後のミス ≈ ${miss}（API 価格）`,
    ttlLine: (mode, source) => `TTL ${mode}: ${source} · 変更: /cache 5m または /cache 1h`,
    sources: {
      detected: 'キャッシュのヒットとミスから判定',
      env: 'CLAUDE_CODE_PROMPT_CACHE_TTL から',
      settings: 'promptCacheTtl 設定から',
      model: 'モデル切り替えから',
      manual: '/cache で設定',
      default: 'サブスクリプションの既定値',
      overage: '利用上限を超えたサブスクリプション',
      api: 'API キーとクラウドプロバイダーの既定値',
    },
    toastWarmed: tokens => `キャッシュをウォームアップしました: キャッシュから ${tokens} トークンを読み取り`,
    toastWarmMissed: tokens => `キャッシュは既に期限切れでした: ${tokens} トークンを再書き込み`,
    toastNothingToFork: 'ウォームアップするものがありません: このセッションにはまだモデルの応答がありません',
    toastApiError: status => `ウォームアップ失敗: API エラー ${status}`.trim(),
    toastWarmFailed: reason => `ウォームアップ失敗: ${reason}`,
    toastExpiresIn: clock => `プロンプトキャッシュはあと ${clock} で期限切れになります`,
    toastTtl5m: gap => `キャッシュは ${gap} もちませんでした: 現在の TTL は5分のようです。タイマーを 5m に切り替えました`,
    toastTtl1h: gap => `キャッシュは ${gap} もちました: TTL は1時間です。タイマーを 1h に切り替えました`,
    toastAutoWarmOff: '自動ウォームアップをオフにしました: 4時間リクエストがありません',
    cmdTtl: mode => `Prompt Cache Timer: キャッシュ TTL = ${mode}`,
    cmdWarming: 'Prompt Cache Timer: キャッシュをウォームアップ中…',
    cmdHidden: 'Prompt Cache Timer: バーを非表示にしました（/cache で再表示）',
    cmdShown: 'Prompt Cache Timer: バーを表示しました',
    commandDescription: 'Prompt Cache Timer: プロンプトキャッシュのバーを表示または非表示（引数: 5m, 1h, warm）',
  },
  zh: {
    cache: '缓存',
    expired: '缓存已过期',
    noRequests: ttl => `缓存：尚无请求 · ${ttl}`,
    minutes: n => `${n} 分钟`,
    ago: span => `${span}前`,
    ttlAuto: mode => `${mode} 自动`,
    missMarker: tokens => `未命中：重写 ${tokens}`,
    priceShort: (warm, miss) => `预热 ≈ ${warm} · 未命中 ≈ ${miss}`,
    warm: '预热',
    warming: '预热中…',
    autoWarm: '自动预热',
    turn: usd => `本轮 ${usd}`,
    context: percent => `上下文 ${percent}%`,
    lastRequest: (ago, read, write, input) =>
      `上次请求 ${ago}：缓存读取 ${read} · 写入 ${write} · 未缓存 ${input}`,
    priceDetail: (warm, miss) => `现在预热 ≈ ${warm} · 过期后未命中 ≈ ${miss}（API 价格）`,
    ttlLine: (mode, source) => `TTL ${mode}：${source} · 修改：/cache 5m 或 /cache 1h`,
    sources: {
      detected: '根据缓存命中与未命中判断',
      env: '来自 CLAUDE_CODE_PROMPT_CACHE_TTL',
      settings: '来自 promptCacheTtl 设置',
      model: '因切换模型',
      manual: '通过 /cache 设置',
      default: '订阅默认值',
      overage: '订阅已超出用量限制',
      api: 'API 密钥和云服务商的默认值',
    },
    toastWarmed: tokens => `缓存已预热：从缓存读取 ${tokens} 个 token`,
    toastWarmMissed: tokens => `缓存已过期：重新写入 ${tokens} 个 token`,
    toastNothingToFork: '无可预热内容：本会话尚无模型回复',
    toastApiError: status => `预热失败：API 错误 ${status}`.trim(),
    toastWarmFailed: reason => `预热失败：${reason}`,
    toastExpiresIn: clock => `提示缓存将在 ${clock} 后过期`,
    toastTtl5m: gap => `缓存未能保持 ${gap}：TTL 现在似乎是 5 分钟。计时器已切换为 5m`,
    toastTtl1h: gap => `缓存保持了 ${gap}：TTL 为 1 小时。计时器已切换为 1h`,
    toastAutoWarmOff: '自动预热已关闭：4 小时内没有你的请求',
    cmdTtl: mode => `Prompt Cache Timer：缓存 TTL = ${mode}`,
    cmdWarming: 'Prompt Cache Timer：正在预热缓存…',
    cmdHidden: 'Prompt Cache Timer：已隐藏缓存栏（/cache 可恢复）',
    cmdShown: 'Prompt Cache Timer：已显示缓存栏',
    commandDescription: 'Prompt Cache Timer：显示或隐藏提示缓存栏（参数：5m、1h、warm）',
  },
  ko: {
    cache: '캐시',
    expired: '캐시 만료',
    noRequests: ttl => `캐시: 아직 요청 없음 · ${ttl}`,
    minutes: n => `${n}분`,
    ago: span => `${span} 전`,
    ttlAuto: mode => `${mode} 자동`,
    missMarker: tokens => `미스: ${tokens} 다시 기록`,
    priceShort: (warm, miss) => `예열 ≈ ${warm} · 미스 ≈ ${miss}`,
    warm: '예열',
    warming: '예열 중…',
    autoWarm: '자동 예열',
    turn: usd => `턴 ${usd}`,
    context: percent => `컨텍스트 ${percent}%`,
    lastRequest: (ago, read, write, input) =>
      `마지막 요청 ${ago}: 캐시 읽기 ${read} · 쓰기 ${write} · 캐시 없음 ${input}`,
    priceDetail: (warm, miss) => `지금 예열 ≈ ${warm} · 만료 후 미스 ≈ ${miss} (API 가격)`,
    ttlLine: (mode, source) => `TTL ${mode}: ${source} · 변경: /cache 5m 또는 /cache 1h`,
    sources: {
      detected: '캐시 적중과 미스로 판단',
      env: 'CLAUDE_CODE_PROMPT_CACHE_TTL에서',
      settings: 'promptCacheTtl 설정에서',
      model: '모델 전환으로',
      manual: '/cache로 설정',
      default: '구독 기본값',
      overage: '사용 한도를 넘은 구독',
      api: 'API 키와 클라우드 제공업체 기본값',
    },
    toastWarmed: tokens => `캐시 예열됨: 캐시에서 ${tokens} 토큰을 읽음`,
    toastWarmMissed: tokens => `캐시가 이미 만료됨: ${tokens} 토큰을 다시 기록`,
    toastNothingToFork: '예열할 내용 없음: 이 세션에 아직 모델 응답이 없습니다',
    toastApiError: status => `예열 실패: API 오류 ${status}`.trim(),
    toastWarmFailed: reason => `예열 실패: ${reason}`,
    toastExpiresIn: clock => `프롬프트 캐시가 ${clock} 후 만료됩니다`,
    toastTtl5m: gap => `캐시가 ${gap}을(를) 버티지 못함: 지금 TTL은 5분인 것 같습니다. 타이머를 5m으로 전환`,
    toastTtl1h: gap => `캐시가 ${gap}을(를) 버팀: TTL은 1시간입니다. 타이머를 1h로 전환`,
    toastAutoWarmOff: '자동 예열 꺼짐: 4시간 동안 요청이 없었습니다',
    cmdTtl: mode => `Prompt Cache Timer: 캐시 TTL = ${mode}`,
    cmdWarming: 'Prompt Cache Timer: 캐시 예열 중…',
    cmdHidden: 'Prompt Cache Timer: 막대 숨김 (/cache로 다시 표시)',
    cmdShown: 'Prompt Cache Timer: 막대 표시',
    commandDescription: 'Prompt Cache Timer: 프롬프트 캐시 막대 표시 또는 숨기기 (인수: 5m, 1h, warm)',
  },
}

// Language names as people type them into Claude Code's `language` setting,
// in English and in the language itself.
const NAMES: Record<Locale, readonly string[]> = {
  en: ['english'],
  ru: ['russian', 'русский', 'русском'],
  uk: ['ukrainian', 'українська', 'украинский'],
  de: ['german', 'deutsch'],
  fr: ['french', 'français', 'francais'],
  es: ['spanish', 'español', 'espanol', 'castellano'],
  pt: ['portuguese', 'português', 'portugues'],
  it: ['italian', 'italiano'],
  ja: ['japanese', '日本語'],
  zh: ['chinese', 'mandarin', '中文', '汉语', '漢語', '简体', '繁體'],
  ko: ['korean', '한국어'],
}

// A locale from a code (`ru`, `pt-BR`, `zh_Hans`) or a language name.
export function matchLocale(value: unknown): Locale | null {
  if (typeof value !== 'string') {
    return null
  }

  const text = value.trim().toLowerCase()
  if (!text) {
    return null
  }

  const code = text.split(/[-_.@\s]/)[0] ?? ''
  const byCode = LOCALES.find(locale => locale === code)
  if (byCode) {
    return byCode
  }

  return LOCALES.find(locale => NAMES[locale].some(name => text.includes(name))) ?? null
}

// The band's language: the mod's own option unless it is `auto`, then Claude
// Code's `language` setting, then the system locale, then English.
export function resolveLocale(option: unknown, settingsLanguage: unknown, systemLocale: unknown): Locale {
  if (option !== 'auto') {
    const chosen = matchLocale(option)
    if (chosen) {
      return chosen
    }
  }

  return matchLocale(settingsLanguage) ?? matchLocale(systemLocale) ?? 'en'
}

export function systemLocale(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().locale
  } catch {
    return null
  }
}
