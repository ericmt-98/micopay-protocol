import type { FastifyInstance } from 'fastify';

const CACHE_TTL_MS = 60_000;
const TIMEOUT_MS = 5_000;
// Last-resort estimate only if every live source fails AND there's no cache.
const FALLBACK_RATE = Number(process.env.XLM_MXN_FALLBACK ?? 3.2);

interface CacheEntry {
  rate: number;
  source: string;
  fetchedAt: string;
}

let cache: CacheEntry | null = null;

/** @internal — exposed for testing */
export function __resetCache(): void {
  cache = null;
}

const round = (n: number) => Math.round(n * 1e6) / 1e6;

/**
 * Real XLM→MXN composed from XLM/USD (Binance) × USD/MXN (er-api). Both are
 * reachable from cloud IPs (unlike CoinGecko, which 429s from shared egress).
 */
async function fetchFromBinanceErapi(): Promise<CacheEntry> {
  const [xlmUsd, usdMxn] = await Promise.all([
    fetch('https://api.binance.com/api/v3/ticker/price?symbol=XLMUSDT', {
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
      .then((r) => r.json())
      .then((d: any) => parseFloat(d?.price)),
    fetch('https://open.er-api.com/v6/latest/USD', { signal: AbortSignal.timeout(TIMEOUT_MS) })
      .then((r) => r.json())
      .then((d: any) => Number(d?.rates?.MXN)),
  ]);
  if (!(xlmUsd > 0) || !(usdMxn > 0)) {
    throw new Error(`bad binance/erapi payload: xlmUsd=${xlmUsd} usdMxn=${usdMxn}`);
  }
  return { rate: round(xlmUsd * usdMxn), source: 'binance+erapi', fetchedAt: new Date().toISOString() };
}

/** Secondary: CoinGecko direct XLM/MXN (works when not rate-limited). */
async function fetchFromCoinGecko(): Promise<CacheEntry> {
  const res = await fetch(
    'https://api.coingecko.com/api/v3/simple/price?ids=stellar&vs_currencies=mxn',
    { signal: AbortSignal.timeout(TIMEOUT_MS), headers: { Accept: 'application/json', 'User-Agent': 'micopay/1.0' } },
  );
  if (!res.ok) throw new Error(`CoinGecko ${res.status}`);
  const data = (await res.json()) as { stellar?: { mxn?: number } };
  const rate = data?.stellar?.mxn;
  if (!(typeof rate === 'number' && rate > 0)) throw new Error('bad coingecko payload');
  return { rate, source: 'coingecko', fetchedAt: new Date().toISOString() };
}

export async function rateRoutes(app: FastifyInstance) {
  app.get('/rate/xlm-mxn', async (request) => {
    const now = Date.now();

    if (cache && now - new Date(cache.fetchedAt).getTime() < CACHE_TTL_MS) {
      return cache;
    }

    // Try real sources in order of reliability-from-cloud.
    for (const source of [fetchFromBinanceErapi, fetchFromCoinGecko]) {
      try {
        const fresh = await source();
        cache = fresh;
        return fresh;
      } catch (err) {
        request.log.warn({ err: err instanceof Error ? err.message : err, category: 'rate' }, '[rate] source failed, trying next');
      }
    }

    // Everything failed: serve last-known cache if any, else a marked estimate.
    if (cache) return { ...cache, stale: true };
    return { rate: FALLBACK_RATE, source: 'fallback', fetchedAt: new Date().toISOString(), stale: true };
  });
}
