import type { FastifyInstance } from 'fastify';
import { UpstreamError } from '../utils/errors.js';

const COINGECKO_URL = 'https://api.coingecko.com/api/v3/simple/price?ids=stellar&vs_currencies=mxn';

export async function rateRoutes(app: FastifyInstance) {
  app.get('/rate/xlm-mxn', async (_request, _reply) => {
    const res = await fetch(COINGECKO_URL, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) {
      throw new UpstreamError(
        'RATE_FETCH_FAILED',
        'No se pudo obtener la tasa de cambio en este momento.',
        `CoinGecko responded ${res.status}`,
        503,
      );
    }
    const data = await res.json() as { stellar?: { mxn?: number } };
    const rate = data?.stellar?.mxn;
    if (typeof rate !== 'number' || rate <= 0) {
      throw new UpstreamError(
        'RATE_FETCH_FAILED',
        'No se pudo obtener la tasa de cambio en este momento.',
        `Unexpected CoinGecko payload: ${JSON.stringify(data)}`,
        503,
      );
    }
    return {
      rate,
      source: 'coingecko',
      fetchedAt: new Date().toISOString(),
    };
  });
}
