import { useState, useEffect, useRef, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  getCETESRate,
  buyCETES,
  sellCETES,
  getRampQuote,
  createRampOrder,
  getRampOrderStatus,
  registerBankAccount,
  CETESRate,
  CETESTxResult,
  RampQuote,
  RampOrder,
} from '../services/api';
import { readJSON, writeJSON } from '../services/secureStorage';
import { extractApiErrorPayload } from '../utils/apiError';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CETESScreenProps {
  onBack: () => void;
  onBanco?: () => void;
  userToken?: string;
  onNavigateKYC?: () => void;
}

type Tab = 'buy' | 'sell' | 'spei';
type SourceAsset = 'XLM' | 'USDC' | 'MXNe';
type SpeiStep = 'quote' | 'instructions' | 'polling';

const KYC_STATUS_KEY = 'kyc_status';
const BANK_ACCOUNT_KEY = 'ramp_bank_account';
const POLL_INTERVAL_MS = 5_000;

interface StoredBankAccount {
  bankAccountId: string;
  clabe: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

const CETESScreen = ({ onBack, onBanco, userToken, onNavigateKYC }: CETESScreenProps) => {
  // ── shared state ──
  const [tab, setTab] = useState<Tab>('buy');
  const [rate, setRate] = useState<CETESRate | null>(null);
  const [rateLoading, setRateLoading] = useState(true);

  // ── buy/sell state ──
  const [amount, setAmount] = useState('');
  const [sourceAsset, setSourceAsset] = useState<SourceAsset>('XLM');
  const [txLoading, setTxLoading] = useState(false);
  const [txResult, setTxResult] = useState<CETESTxResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ── SPEI state ──
  const [speiStep, setSpeiStep] = useState<SpeiStep>('quote');
  const [speiAmount, setSpeiAmount] = useState('');
  const [speiQuote, setSpeiQuote] = useState<RampQuote | null>(null);
  const [speiOrder, setSpeiOrder] = useState<RampOrder | null>(null);
  const [speiOrderId, setSpeiOrderId] = useState<string | null>(null);
  const [speiStatus, setSpeiStatus] = useState<string | null>(null);
  const [speiStellarHash, setSpeiStellarHash] = useState<string | null>(null);
  const [speiLoading, setSpeiLoading] = useState(false);
  const [speiError, setSpeiError] = useState<string | null>(null);
  const [quoteSecondsLeft, setQuoteSecondsLeft] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  // ── CLABE modal state ──
  const [showClabeModal, setShowClabeModal] = useState(false);
  const [clabeInput, setClabeInput] = useState('');
  const [clabeLoading, setClabeLoading] = useState(false);
  const [clabeError, setClabeError] = useState<string | null>(null);
  const [storedBankAccount, setStoredBankAccount] = useState<StoredBankAccount | null>(null);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── load CETES rate + cached bank account ──
  useEffect(() => {
    getCETESRate()
      .then(setRate)
      .catch(() => {})
      .finally(() => setRateLoading(false));

    readJSON<StoredBankAccount>(BANK_ACCOUNT_KEY).then((acc) => {
      if (acc?.bankAccountId) setStoredBankAccount(acc);
    });
  }, []);

  // ── cleanup on unmount ──
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  // ── quote countdown ──
  useEffect(() => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    if (!speiQuote?.expiresAt || speiStep !== 'quote') return;

    const tick = () => {
      const secs = Math.max(0, Math.floor((new Date(speiQuote.expiresAt).getTime() - Date.now()) / 1000));
      setQuoteSecondsLeft(secs);
      if (secs === 0) clearInterval(countdownRef.current!);
    };
    tick();
    countdownRef.current = setInterval(tick, 1000);
    return () => { if (countdownRef.current) clearInterval(countdownRef.current); };
  }, [speiQuote, speiStep]);

  // ── polling ──
  const stopPolling = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }, []);

  const startPolling = useCallback((orderId: string) => {
    if (!userToken) return;
    stopPolling();
    pollRef.current = setInterval(async () => {
      try {
        const statusRes = await getRampOrderStatus(orderId, userToken);
        setSpeiStatus(statusRes.status);
        if (statusRes.stellarTxHash) setSpeiStellarHash(statusRes.stellarTxHash);
        if (statusRes.status === 'completed' || statusRes.status === 'failed') stopPolling();
      } catch {
        // silent — keep polling
      }
    }, POLL_INTERVAL_MS);
  }, [userToken, stopPolling]);

  // ── buy/sell helpers ──
  const cetesPreview = (): string => {
    if (!amount || isNaN(parseFloat(amount))) return '—';
    const num = parseFloat(amount);
    if (tab === 'buy') {
      if (sourceAsset === 'XLM') {
        const xlmPerUsdc = rate?.xlmPerUsdc ?? 17.24;
        const usdc = num / xlmPerUsdc;
        const mxn = usdc * 17.5;
        return (mxn / (rate?.cesPriceMxn ?? 10)).toFixed(2);
      }
      if (sourceAsset === 'USDC') return ((num * 17.5) / (rate?.cesPriceMxn ?? 10)).toFixed(2);
      return (num / (rate?.cesPriceMxn ?? 10)).toFixed(2);
    } else {
      const mxn = num * (rate?.cesPriceMxn ?? 10);
      if (sourceAsset === 'XLM') return ((mxn / 17.5) * (rate?.xlmPerUsdc ?? 17.24)).toFixed(2);
      if (sourceAsset === 'USDC') return (mxn / 17.5).toFixed(2);
      return mxn.toFixed(2);
    }
  };

  const handleTx = async () => {
    if (!amount || parseFloat(amount) <= 0) return;
    setTxLoading(true);
    setError(null);
    setTxResult(null);
    try {
      const result = tab === 'buy'
        ? await buyCETES(amount, sourceAsset)
        : await sellCETES(amount, sourceAsset);
      setTxResult(result);
      setAmount('');
    } catch (err: unknown) {
      setError(extractApiErrorPayload(err).message);
    } finally {
      setTxLoading(false);
    }
  };

  // ── SPEI handlers ──
  const handleSpeiTabClick = async () => {
    const kycStatus = await readJSON<string>(KYC_STATUS_KEY);
    if (kycStatus !== 'approved') {
      if (onNavigateKYC) {
        onNavigateKYC();
        return;
      }
    }
    setTab('spei');
    setSpeiStep('quote');
    setSpeiQuote(null);
    setSpeiOrder(null);
    setSpeiError(null);
    stopPolling();
  };

  const handleGetQuote = async () => {
    if (!userToken) { setSpeiError('Debes iniciar sesión primero.'); return; }
    if (!speiAmount || parseFloat(speiAmount) <= 0) { setSpeiError('Ingresa un monto válido.'); return; }
    setSpeiLoading(true);
    setSpeiError(null);
    try {
      const q = await getRampQuote('onramp', speiAmount, userToken);
      setSpeiQuote(q);
    } catch (err: unknown) {
      setSpeiError(extractApiErrorPayload(err).message);
    } finally {
      setSpeiLoading(false);
    }
  };

  const handleConfirmQuote = async () => {
    if (!userToken || !speiQuote) return;
    // ensure we have a bank account ID
    let bankAccountId = storedBankAccount?.bankAccountId ?? null;
    if (!bankAccountId) {
      setShowClabeModal(true);
      return;
    }
    await _createOrder(speiQuote.quoteId, bankAccountId);
  };

  const _createOrder = async (quoteId: string, bankAccountId: string) => {
    if (!userToken) return;
    setSpeiLoading(true);
    setSpeiError(null);
    try {
      const order = await createRampOrder(quoteId, bankAccountId, userToken);
      setSpeiOrder(order);
      setSpeiOrderId(order.orderId);
      setSpeiStep('instructions');
    } catch (err: unknown) {
      setSpeiError(extractApiErrorPayload(err).message);
    } finally {
      setSpeiLoading(false);
    }
  };

  const handleProceedToPolling = () => {
    if (!speiOrderId) return;
    setSpeiStep('polling');
    setSpeiStatus('funded');
    startPolling(speiOrderId);
  };

  const handleRegisterClabe = async () => {
    if (!userToken) return;
    const trimmed = clabeInput.trim();
    if (!/^\d{18}$/.test(trimmed)) {
      setClabeError('La CLABE debe tener exactamente 18 dígitos.');
      return;
    }
    setClabeLoading(true);
    setClabeError(null);
    try {
      const result = await registerBankAccount(trimmed, userToken);
      const acc: StoredBankAccount = { bankAccountId: result.bankAccountId, clabe: result.clabe };
      await writeJSON(BANK_ACCOUNT_KEY, acc);
      setStoredBankAccount(acc);
      setShowClabeModal(false);
      setClabeInput('');
      // now proceed with the order
      if (speiQuote) await _createOrder(speiQuote.quoteId, acc.bankAccountId);
    } catch (err: unknown) {
      setClabeError(extractApiErrorPayload(err).message);
    } finally {
      setClabeLoading(false);
    }
  };

  const handleCopyClabe = (clabe: string) => {
    navigator.clipboard.writeText(clabe).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleResetSpei = () => {
    stopPolling();
    setSpeiStep('quote');
    setSpeiQuote(null);
    setSpeiOrder(null);
    setSpeiOrderId(null);
    setSpeiStatus(null);
    setSpeiStellarHash(null);
    setSpeiAmount('');
    setSpeiError(null);
  };

  const quoteExpired = quoteSecondsLeft === 0;
  const shortHash = (h: string) => (h.length > 16 ? `${h.slice(0, 8)}…${h.slice(-8)}` : h);


  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="bg-surface text-on-surface font-body min-h-screen flex flex-col pb-10">
      {/* Header */}
      <header className="fixed top-0 left-0 w-full z-50 flex items-center gap-4 px-4 py-4 pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur-md bg-white/90 border-b border-outline-variant/10">
        <button
          onClick={onBack}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container-low transition-colors"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div>
          <h1 className="font-headline font-bold text-lg leading-tight">CETES Tokenizados</h1>
          <p className="text-[11px] text-on-surface-variant">Bonos del Gobierno de México · Etherfuse</p>
        </div>
        <div className="ml-auto bg-primary/10 border border-primary/20 rounded-full px-3 py-1">
          <span className="text-primary font-bold text-sm">{rate?.apy ?? 11.45}% anual</span>
        </div>
      </header>

      <main className="flex-1 mt-20 px-4 pt-4 space-y-5">
        {/* Info card */}
        <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-[24px] p-5 border border-primary/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
              <span className="material-symbols-outlined text-primary">trending_up</span>
            </div>
            <div>
              <p className="font-bold text-on-surface text-base">Tasa de rendimiento</p>
              {rateLoading ? (
                <p className="text-xs text-outline">Cargando…</p>
              ) : (
                <p className="text-xs text-on-surface-variant">{rate?.note}</p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/60 rounded-2xl p-3 text-center">
              <p className="text-2xl font-extrabold text-primary">{rate?.apy ?? 11.45}%</p>
              <p className="text-xs text-on-surface-variant mt-1">Rendimiento anual</p>
            </div>
            <div className="bg-white/60 rounded-2xl p-3 text-center">
              <p className="text-2xl font-extrabold text-on-surface">
                {rateLoading ? '…' : `${((rate?.apy ?? 11.45) / 12).toFixed(2)}`}%
              </p>
              <p className="text-xs text-on-surface-variant mt-1">Rendimiento mensual</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 bg-surface-container-low rounded-2xl p-1">
          {(['buy', 'sell'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setTxResult(null); setError(null); }}
              className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all ${
                tab === t ? 'bg-white text-primary shadow-sm' : 'text-on-surface-variant'
              }`}
            >
              {t === 'buy' ? 'Comprar' : 'Vender'}
            </button>
          ))}
          <button
            onClick={handleSpeiTabClick}
            className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all ${
              tab === 'spei' ? 'bg-white text-primary shadow-sm' : 'text-on-surface-variant'
            }`}
          >
            SPEI
          </button>
        </div>

        {/* ── Buy / Sell tab ── */}
        {(tab === 'buy' || tab === 'sell') && (
          <div className="bg-white rounded-[24px] p-5 border border-outline-variant/10 shadow-sm space-y-4">
            <div>
              <label className="block text-xs font-bold text-on-surface-variant mb-2 uppercase tracking-wide">
                {tab === 'buy' ? 'Pagar con' : 'Recibir en'}
              </label>
              <div className="flex gap-2">
                {(['XLM', 'USDC', 'MXNe'] as SourceAsset[]).map((a) => (
                  <button
                    key={a}
                    onClick={() => setSourceAsset(a)}
                    className={`flex-1 py-2 rounded-xl font-bold text-sm border transition-all ${
                      sourceAsset === a
                        ? 'bg-primary text-white border-primary'
                        : 'bg-white text-on-surface-variant border-outline-variant/30'
                    }`}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-on-surface-variant mb-2 uppercase tracking-wide">
                {tab === 'buy' ? `Cantidad en ${sourceAsset}` : 'Cantidad en CETES'}
              </label>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-surface-container-low border border-outline-variant/20 rounded-2xl px-4 py-3 text-xl font-bold text-on-surface focus:outline-none focus:border-primary transition-colors"
              />
            </div>

            {amount && parseFloat(amount) > 0 && (
              <div className="bg-primary/5 rounded-2xl px-4 py-3 flex justify-between items-center">
                <span className="text-sm text-on-surface-variant">Recibirás ~</span>
                <span className="font-bold text-on-surface">
                  {cetesPreview()} {tab === 'buy' ? 'CETES' : sourceAsset}
                </span>
              </div>
            )}

            {error && (
              <div className="bg-error/10 border border-error/20 rounded-2xl px-4 py-3">
                <p className="text-sm text-error font-medium">{error}</p>
              </div>
            )}

            {txResult && (
              <div className="bg-[#e6f9f1] border border-[#1D9E75]/20 rounded-2xl px-4 py-3 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#1D9E75] text-xl">check_circle</span>
                  <p className="font-bold text-[#1D9E75]">
                    {txResult.simulated ? '¡Prueba simulada!' : '¡Operación enviada!'}
                  </p>
                </div>
                <p className="text-xs text-on-surface-variant">
                  Hash: <span className="font-mono">{shortHash(txResult.hash)}</span>
                </p>
                {txResult.cetesReceived && (
                  <p className="text-sm font-bold text-on-surface">+{txResult.cetesReceived} CETES acreditados</p>
                )}
                <a
                  href={txResult.explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-primary font-bold"
                >
                  Ver en el explorador Stellar
                  <span className="material-symbols-outlined text-sm">open_in_new</span>
                </a>
              </div>
            )}

            <button
              onClick={handleTx}
              disabled={txLoading || !amount || parseFloat(amount) <= 0}
              className="w-full bg-primary text-white font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
            >
              {txLoading ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>
                  Procesando…
                </>
              ) : tab === 'buy' ? (
                <>Comprar CETES <span className="material-symbols-outlined text-lg">arrow_forward</span></>
              ) : (
                <>Vender CETES <span className="material-symbols-outlined text-lg">swap_horiz</span></>
              )}
            </button>
          </div>
        )}

        {/* ── SPEI tab ── */}
        {tab === 'spei' && (
          <>
            {/* Subpaso 1: Cotización */}
            {speiStep === 'quote' && (
              <div className="bg-white rounded-[24px] p-5 border border-outline-variant/10 shadow-sm space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-primary text-base">account_balance</span>
                  </div>
                  <div>
                    <p className="font-bold text-on-surface text-sm">Depositar vía SPEI</p>
                    <p className="text-xs text-on-surface-variant">MXN → CETES tokenizados</p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-on-surface-variant mb-2 uppercase tracking-wide">
                    Monto en MXN
                  </label>
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="any"
                    placeholder="0.00"
                    value={speiAmount}
                    onChange={(e) => { setSpeiAmount(e.target.value); setSpeiQuote(null); setSpeiError(null); }}
                    className="w-full bg-surface-container-low border border-outline-variant/20 rounded-2xl px-4 py-3 text-xl font-bold text-on-surface focus:outline-none focus:border-primary transition-colors"
                  />
                </div>

                {/* Quote result */}
                {speiQuote && !quoteExpired && (
                  <div className="bg-primary/5 rounded-2xl p-4 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-on-surface-variant">Recibirás ~</span>
                      <span className="font-extrabold text-on-surface text-base">
                        {parseFloat(speiQuote.destinationAmount).toFixed(4)} CETES
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-on-surface-variant">Tasa de cambio</span>
                      <span className="text-xs font-bold text-on-surface">
                        1 CETES = ${speiQuote.exchangeRate} MXN
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-on-surface-variant">Cotización expira en</span>
                      <span className={`text-xs font-bold ${(quoteSecondsLeft ?? 999) < 30 ? 'text-error' : 'text-[#1D9E75]'}`}>
                        {quoteSecondsLeft !== null
                          ? `${Math.floor(quoteSecondsLeft / 60)}:${String(quoteSecondsLeft % 60).padStart(2, '0')}`
                          : '—'}
                      </span>
                    </div>
                  </div>
                )}

                {/* Quote expired warning */}
                {speiQuote && quoteExpired && (
                  <div className="bg-error/10 border border-error/20 rounded-2xl px-4 py-3 flex items-center gap-2">
                    <span className="material-symbols-outlined text-error text-base">warning</span>
                    <p className="text-sm text-error font-medium">
                      La cotización expiró. Obtén una nueva.
                    </p>
                  </div>
                )}

                {speiError && (
                  <div className="bg-error/10 border border-error/20 rounded-2xl px-4 py-3">
                    <p className="text-sm text-error font-medium">{speiError}</p>
                  </div>
                )}

                {/* Buttons */}
                {(!speiQuote || quoteExpired) && (
                  <button
                    onClick={handleGetQuote}
                    disabled={speiLoading || !speiAmount || parseFloat(speiAmount) <= 0}
                    className="w-full bg-primary text-white font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
                  >
                    {speiLoading ? (
                      <><span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>Obteniendo cotización…</>
                    ) : (
                      <>Obtener cotización <span className="material-symbols-outlined text-lg">calculate</span></>
                    )}
                  </button>
                )}

                {speiQuote && !quoteExpired && (
                  <button
                    onClick={handleConfirmQuote}
                    disabled={speiLoading}
                    className="w-full bg-primary text-white font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
                  >
                    {speiLoading ? (
                      <><span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>Creando orden…</>
                    ) : (
                      <>Continuar <span className="material-symbols-outlined text-lg">arrow_forward</span></>
                    )}
                  </button>
                )}
              </div>
            )}

            {/* Subpaso 2: Instrucciones de transferencia */}
            {speiStep === 'instructions' && speiOrder && (
              <div className="bg-white rounded-[24px] p-5 border border-outline-variant/10 shadow-sm space-y-5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-[#1D9E75]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-[#1D9E75] text-base">send_money</span>
                  </div>
                  <div>
                    <p className="font-bold text-on-surface text-sm">Haz la transferencia SPEI</p>
                    <p className="text-xs text-on-surface-variant">Usa los datos exactos de abajo</p>
                  </div>
                </div>

                {/* Transfer details */}
                <div className="bg-surface-container-low rounded-2xl divide-y divide-outline-variant/10">
                  {/* CLABE row */}
                  <div className="px-4 py-3 flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wide mb-0.5">CLABE Destino</p>
                      <p className="font-mono font-bold text-on-surface text-sm break-all">
                        {speiOrder.depositClabe ?? '646180157000000004'}
                      </p>
                    </div>
                    <button
                      onClick={() => handleCopyClabe(speiOrder.depositClabe ?? '646180157000000004')}
                      className="flex-shrink-0 flex items-center gap-1 bg-primary/10 text-primary font-bold text-xs px-3 py-2 rounded-xl active:scale-95 transition-all"
                    >
                      <span className="material-symbols-outlined text-sm">{copied ? 'check' : 'content_copy'}</span>
                      {copied ? 'Copiado' : 'Copiar'}
                    </button>
                  </div>
                  {/* Bank */}
                  <div className="px-4 py-3">
                    <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wide mb-0.5">Banco</p>
                    <p className="font-bold text-on-surface text-sm">{speiOrder.depositBankName ?? 'Etherfuse MX'}</p>
                  </div>
                  {/* Holder */}
                  <div className="px-4 py-3">
                    <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wide mb-0.5">Titular</p>
                    <p className="font-bold text-on-surface text-sm">{speiOrder.depositAccountHolder ?? 'Etherfuse MX'}</p>
                  </div>
                  {/* Amount */}
                  <div className="px-4 py-3">
                    <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wide mb-0.5">Monto exacto</p>
                    <p className="font-extrabold text-on-surface text-base">
                      ${speiOrder.depositAmount ?? speiAmount} MXN
                    </p>
                  </div>
                </div>

                {/* QR Code */}
                <div className="flex flex-col items-center gap-3 py-2">
                  <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wide">QR de la CLABE</p>
                  <div className="p-3 bg-white rounded-2xl border border-outline-variant/20 shadow-sm">
                    <QRCodeSVG
                      value={speiOrder.depositClabe ?? '646180157000000004'}
                      size={160}
                      level="M"
                    />
                  </div>
                </div>

                {/* Notice */}
                <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex gap-2">
                  <span className="material-symbols-outlined text-amber-600 text-base flex-shrink-0 mt-0.5">info</span>
                  <p className="text-xs text-amber-800 font-medium leading-relaxed">
                    Haz la transferencia desde tu app bancaria. Confirmamos en ~5 minutos.
                  </p>
                </div>

                <button
                  onClick={handleProceedToPolling}
                  className="w-full bg-primary text-white font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-primary/20 transition-all active:scale-[0.98]"
                >
                  Ya transferí, esperar confirmación
                  <span className="material-symbols-outlined text-lg">schedule</span>
                </button>
              </div>
            )}

            {/* Subpaso 3: Esperando confirmación / Polling */}
            {speiStep === 'polling' && (
              <div className="bg-white rounded-[24px] p-5 border border-outline-variant/10 shadow-sm space-y-5">
                {/* Completed */}
                {speiStatus === 'completed' && (
                  <>
                    <div className="flex flex-col items-center gap-3 py-4 text-center">
                      <div className="w-16 h-16 rounded-full bg-[#1D9E75]/10 flex items-center justify-center">
                        <span className="material-symbols-outlined text-[#1D9E75] text-4xl">check_circle</span>
                      </div>
                      <p className="font-extrabold text-on-surface text-lg">¡CETES acreditados!</p>
                      <p className="text-sm text-on-surface-variant">
                        Recibiste {speiQuote ? parseFloat(speiQuote.destinationAmount).toFixed(4) : '—'} CETES en tu wallet Stellar.
                      </p>
                      {speiStellarHash && (
                        <a
                          href={`https://stellar.expert/explorer/testnet/tx/${speiStellarHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs text-primary font-bold"
                        >
                          <span className="font-mono">{shortHash(speiStellarHash)}</span>
                          <span className="material-symbols-outlined text-sm">open_in_new</span>
                        </a>
                      )}
                    </div>
                    <button
                      onClick={handleResetSpei}
                      className="w-full border border-primary text-primary font-bold py-3 rounded-2xl transition-all active:scale-[0.98]"
                    >
                      Hacer otro depósito
                    </button>
                  </>
                )}

                {/* Failed */}
                {speiStatus === 'failed' && (
                  <>
                    <div className="flex flex-col items-center gap-3 py-4 text-center">
                      <div className="w-16 h-16 rounded-full bg-error/10 flex items-center justify-center">
                        <span className="material-symbols-outlined text-error text-4xl">error</span>
                      </div>
                      <p className="font-extrabold text-on-surface text-lg">Ocurrió un error</p>
                      <p className="text-sm text-on-surface-variant">
                        No se pudo procesar tu transferencia. Contacta a soporte si el cargo fue aplicado.
                      </p>
                    </div>
                    <a
                      href="mailto:soporte@micopay.mx"
                      className="w-full flex items-center justify-center gap-2 border border-error text-error font-bold py-3 rounded-2xl transition-all active:scale-[0.98]"
                    >
                      <span className="material-symbols-outlined text-base">mail</span>
                      Contactar soporte
                    </a>
                    <button
                      onClick={handleResetSpei}
                      className="w-full border border-outline-variant/30 text-on-surface-variant font-bold py-3 rounded-2xl transition-all active:scale-[0.98]"
                    >
                      Intentar de nuevo
                    </button>
                  </>
                )}

                {/* Pending / waiting */}
                {speiStatus !== 'completed' && speiStatus !== 'failed' && (
                  <>
                    <div className="flex flex-col items-center gap-4 py-6 text-center">
                      <div className="w-16 h-16 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                      <p className="font-bold text-on-surface text-base">Esperando tu transferencia…</p>
                      <p className="text-sm text-on-surface-variant max-w-xs">
                        Verificamos el pago cada 5 segundos. No cierres esta pantalla.
                      </p>
                    </div>
                    <div className="bg-surface-container-low rounded-2xl px-4 py-3 flex justify-between items-center">
                      <span className="text-xs text-on-surface-variant">Orden</span>
                      <span className="font-mono text-xs font-bold text-on-surface">{shortHash(speiOrderId ?? '')}</span>
                    </div>
                  </>
                )}
              </div>
            )}
          </>
        )}

        {/* Bank onramp card — only on buy/sell tabs */}
        {tab !== 'spei' && (
          <button
            onClick={onBanco}
            className="w-full bg-white border border-outline-variant/20 rounded-[24px] p-5 flex items-center gap-4 shadow-sm active:scale-[0.98] transition-all text-left"
          >
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-primary">account_balance_wallet</span>
            </div>
            <div className="flex-1">
              <p className="font-bold text-on-surface text-sm">¿Sin cripto?</p>
              <p className="text-xs text-on-surface-variant">Conecta tu banco vía SPEI para empezar</p>
            </div>
            <span className="material-symbols-outlined text-on-surface-variant">chevron_right</span>
          </button>
        )}

        <p className="text-center text-xs text-outline pb-4">
          CETES tokenizados por Etherfuse · Red Stellar · {rate?.network ?? 'TESTNET'}
        </p>
      </main>

      {/* ── CLABE Modal ── */}
      {showClabeModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-t-[32px] p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <p className="font-headline font-bold text-on-surface text-base">Registra tu CLABE</p>
              <button
                onClick={() => { setShowClabeModal(false); setClabeError(null); setClabeInput(''); }}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-container-low transition-colors"
              >
                <span className="material-symbols-outlined text-on-surface-variant">close</span>
              </button>
            </div>
            <p className="text-sm text-on-surface-variant">
              Ingresa la CLABE de tu cuenta bancaria para recibir reembolsos. Solo se solicita la primera vez.
            </p>
            <input
              type="text"
              inputMode="numeric"
              maxLength={18}
              placeholder="18 dígitos"
              value={clabeInput}
              onChange={(e) => { setClabeInput(e.target.value.replace(/\D/g, '')); setClabeError(null); }}
              className="w-full bg-surface-container-low border border-outline-variant/20 rounded-2xl px-4 py-3 text-lg font-mono font-bold text-on-surface focus:outline-none focus:border-primary transition-colors"
            />
            <p className="text-[10px] text-on-surface-variant">
              {clabeInput.length}/18 dígitos
            </p>
            {clabeError && (
              <div className="bg-error/10 border border-error/20 rounded-2xl px-4 py-3">
                <p className="text-sm text-error font-medium">{clabeError}</p>
              </div>
            )}
            <button
              onClick={handleRegisterClabe}
              disabled={clabeLoading || clabeInput.length !== 18}
              className="w-full bg-primary text-white font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
            >
              {clabeLoading ? (
                <><span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>Registrando…</>
              ) : (
                <>Guardar y continuar <span className="material-symbols-outlined text-lg">arrow_forward</span></>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CETESScreen;
