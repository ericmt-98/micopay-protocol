import { useCallback, useEffect, useState } from 'react';
import { fetchTradeDetail, cancelTradeRequest, type TradeDetailResponse } from '../services/api';
import MerchantUnavailableBanner from '../components/MerchantUnavailableBanner';

const POLL_MS = 3000;
const STELLAR_EXPLORER = 'https://stellar.expert/explorer/testnet/tx';

export interface TradeDetailLoadedTrade {
  id: string;
  status: string;
  amount_mxn: number;
  secret_hash: string;
  lock_tx_hash?: string | null;
}

interface TradeDetailProps {
  tradeId: string;
  buyerToken: string | null;
  flow: 'cashout' | 'deposit';
  onOpenQR: () => void;
  onOpenChat: () => void;
  onCancelRematch: (amountMxn: number) => void;
  onBackToMap: () => void;
  onTradeLoaded?: (trade: TradeDetailLoadedTrade) => void;
}

export default function TradeDetail({
  tradeId,
  buyerToken,
  flow,
  onOpenQR,
  onOpenChat,
  onCancelRematch,
  onBackToMap,
  onTradeLoaded,
}: TradeDetailProps) {
  const [detail, setDetail] = useState<TradeDetailResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);

  const poll = useCallback(async () => {
    if (!buyerToken) {
      setLoadError('No session. Open the app from the home screen to continue.');
      return;
    }
    try {
      const data = await fetchTradeDetail(tradeId, buyerToken);
      setDetail(data);
      setLoadError(null);
      const t = data.trade;
      onTradeLoaded?.({
        id: t.id,
        status: t.status,
        amount_mxn: t.amount_mxn,
        secret_hash: t.secret_hash,
        lock_tx_hash: t.lock_tx_hash ?? null,
      });
    } catch (e: unknown) {
      const msg = e && typeof e === 'object' && 'response' in e
        && (e as { response?: { data?: { message?: string } } }).response?.data?.message;
      setLoadError(typeof msg === 'string' ? msg : 'Could not load this trade.');
    }
  }, [buyerToken, tradeId, onTradeLoaded]);

  useEffect(() => {
    void poll();
    const timer = window.setInterval(() => void poll(), POLL_MS);
    return () => window.clearInterval(timer);
  }, [poll]);

  const merchantName = detail?.seller_username ?? (flow === 'deposit' ? 'Tienda Don Pepe' : 'Farmacia Guadalupe');
  const lockTx = detail?.trade.lock_tx_hash;

  const handleCancelRematch = async () => {
    if (!buyerToken || !detail) return;
    setCancelLoading(true);
    try {
      await cancelTradeRequest(tradeId, buyerToken);
      onCancelRematch(detail.trade.amount_mxn);
    } catch (e) {
      console.error('Cancel trade failed', e);
    } finally {
      setCancelLoading(false);
    }
  };

  return (
    <div className="bg-background text-on-surface font-body min-h-screen flex flex-col">
      <header className="fixed top-0 w-full z-50 flex items-center px-4 py-3 justify-between bg-surface/80 backdrop-blur-md border-b border-surface-container">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onBackToMap}
            className="p-2 hover:bg-surface-container-low transition-colors rounded-full text-primary shrink-0"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div className="min-w-0">
            <h1 className="font-headline font-bold text-lg tracking-tight truncate">{merchantName}</h1>
            <p className="text-[11px] text-on-surface/50 truncate">Trade · {tradeId.slice(0, 8)}…</p>
          </div>
        </div>
      </header>

      <main className="flex-1 mt-[72px] mb-28 px-4 max-w-2xl mx-auto w-full flex flex-col gap-4 pb-8">
        {loadError && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">{loadError}</div>
        )}

        {detail?.merchant_unavailable && (
          <MerchantUnavailableBanner
            onWait={() => undefined}
            onCancelRematch={() => void handleCancelRematch()}
            cancelLoading={cancelLoading}
          />
        )}

        <div className="p-4 rounded-xl bg-primary-container/10 border border-primary/10 flex items-start gap-3">
          <div className="bg-primary text-white rounded-full p-1 flex items-center justify-center shrink-0 mt-0.5">
            <span className="material-symbols-outlined text-sm">check</span>
          </div>
          <div className="flex flex-col gap-1 min-w-0">
            <p className="text-sm font-semibold text-primary">
              {detail ? statusLabel(detail.trade.status) : 'Loading trade…'}
            </p>
            {lockTx ? (
              <a
                href={`${STELLAR_EXPLORER}/${lockTx}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-primary/70 hover:text-primary transition-colors font-mono truncate"
              >
                <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                Ver en Stellar Testnet
                <span className="truncate opacity-60">· {lockTx.substring(0, 12)}…</span>
              </a>
            ) : (
              <p className="text-xs text-on-surface/40">
                {detail ? 'Sin transacción de bloqueo aún' : '…'}
              </p>
            )}
          </div>
        </div>

        {detail && (
          <p className="text-center text-sm text-on-surface/70">
            Monto: <span className="font-semibold text-on-surface">${detail.trade.amount_mxn} MXN</span>
          </p>
        )}

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={onOpenChat}
            className="w-full rounded-xl border border-outline-variant/30 bg-surface py-3 text-sm font-semibold text-primary hover:bg-surface-container-low transition-colors"
          >
            Abrir chat
          </button>
          <button
            type="button"
            onClick={onOpenQR}
            className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-on-primary hover:opacity-95 transition-opacity"
          >
            Ver código QR de pago
          </button>
        </div>
      </main>
    </div>
  );
}

function statusLabel(status: string) {
  switch (status) {
    case 'pending':
      return 'Pendiente · esperando bloqueo';
    case 'locked':
      return '✓ Oferta aceptada · Saldo bloqueado en escrow';
    case 'revealing':
      return '✓ Listo para entrega en efectivo';
    case 'cancelled':
      return 'Operación cancelada';
    case 'completed':
      return 'Completada';
    default:
      return `Estado: ${status}`;
  }
}
