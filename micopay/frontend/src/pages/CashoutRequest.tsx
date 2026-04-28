/**
 * Cash-out amount capture (issue #17).
 *
 * - Enforces the **same** numeric bounds as the backend (`100` … `50_000` integer MXN).
 * - Does **not** create a trade here — only collects input and hands a validated integer to the parent
 *   so the next step can show `TradeConfirmation` before the map / POST /trades.
 */
import { useState } from 'react';
import { TRADE_AMOUNT_MAX_MXN, TRADE_AMOUNT_MIN_MXN } from '../constants/trade';

export interface CashoutRequestProps {
  onBack: () => void;
  /** Parent-owned string so "Back" from confirmation does not wipe the user's digits. */
  amountStr: string;
  onAmountStrChange: (next: string) => void;
  /** Validated integer in [TRADE_AMOUNT_MIN_MXN, TRADE_AMOUNT_MAX_MXN]. */
  onContinueToConfirmation: (amountMxn: number) => void;
}

function parseAmountMx(amountStr: string): number | null {
  const digits = amountStr.replace(/[^\d]/g, '');
  if (digits === '') return null;
  const n = Number.parseInt(digits, 10);
  return Number.isFinite(n) ? n : null;
}

export default function CashoutRequest({
  onBack,
  amountStr,
  onAmountStrChange,
  onContinueToConfirmation,
}: CashoutRequestProps) {
  const [inlineError, setInlineError] = useState<string | null>(null);

  const handleContinue = () => {
    const n = parseAmountMx(amountStr);
    if (n === null) {
      setInlineError('Ingresa un monto en pesos mexicanos (solo números).');
      return;
    }
    if (!Number.isInteger(n)) {
      setInlineError('El monto debe ser un número entero (sin centavos).');
      return;
    }
    if (n < TRADE_AMOUNT_MIN_MXN) {
      setInlineError(`El monto mínimo es $${TRADE_AMOUNT_MIN_MXN} MXN (mismo límite que el servidor).`);
      return;
    }
    if (n > TRADE_AMOUNT_MAX_MXN) {
      setInlineError(`El monto máximo es $${TRADE_AMOUNT_MAX_MXN.toLocaleString('es-MX')} MXN.`);
      return;
    }
    setInlineError(null);
    onContinueToConfirmation(n);
  };

  return (
    <div className="text-on-surface antialiased overflow-x-hidden min-h-screen bg-surface-container-low">
      <header className="fixed top-0 w-full z-50 bg-surface-container-low backdrop-blur-xl shadow-[0_32px_32px_rgba(0,105,76,0.04)]">
        <div className="flex items-center justify-between px-6 py-4 w-full">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={onBack}
              className="text-primary active:scale-95 duration-200 p-2 hover:bg-primary/10 rounded-full"
            >
              <span className="material-symbols-outlined font-bold">arrow_back</span>
            </button>
            <h1 className="font-headline font-bold text-xl tracking-tight text-primary">
              Convertir a efectivo
            </h1>
          </div>
          <div className="w-10" />
        </div>
        <div className="bg-outline-variant/30 h-[1px] w-full self-end" />
      </header>

      <main className="pt-24 pb-32 px-6 flex flex-col min-h-screen max-w-md mx-auto">
        <div className="mt-8 mb-4">
          <label className="font-label text-xs font-bold tracking-[0.15em] text-on-surface-variant opacity-70">
            ¿CUÁNTO QUIERES EN EFECTIVO?
          </label>
        </div>

        <div className="relative group mb-4 py-10 px-4 bg-surface-container-lowest rounded-3xl shadow-sm border border-outline-variant/10 flex flex-col items-center">
          <div className="flex items-center justify-center gap-3 w-full">
            <span className="text-headline text-4xl font-extrabold text-on-surface">$</span>
            <input
              className="w-32 text-headline text-5xl font-extrabold text-on-surface bg-transparent border-none focus:ring-0 p-0 text-center"
              placeholder="0"
              type="text"
              inputMode="numeric"
              value={amountStr}
              onChange={(e) => {
                onAmountStrChange(e.target.value);
                if (inlineError) setInlineError(null);
              }}
            />
            <span className="text-label text-xl font-bold text-primary px-3 py-1 bg-primary/5 rounded-lg">
              MXN
            </span>
          </div>
          <div className="mt-8 flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full border border-primary/10">
            <span
              className="material-symbols-outlined text-primary text-sm font-bold"
              style={{ fontVariationSettings: '"FILL" 1' }}
            >
              account_balance_wallet
            </span>
            <span className="text-label text-[13px] font-bold text-primary">
              Límites servidor: ${TRADE_AMOUNT_MIN_MXN} – ${TRADE_AMOUNT_MAX_MXN.toLocaleString('es-MX')} MXN
            </span>
          </div>
        </div>

        {inlineError ? (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900" role="alert">
            {inlineError}
          </div>
        ) : null}

        <div className="space-y-6">
          <div className="p-6 bg-surface-container-low rounded-2xl border-l-4 border-primary/20">
            <div className="flex gap-4">
              <span className="material-symbols-outlined text-primary opacity-60">info</span>
              <p className="text-body text-[14px] leading-relaxed text-on-surface-variant font-medium">
                Después verás una pantalla de confirmación con comisión (0.8%) y tiempo máximo antes del mapa.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-surface-container-highest/30 p-4 rounded-2xl flex flex-col gap-2">
              <span className="material-symbols-outlined text-primary">location_on</span>
              <span className="text-xs font-bold text-on-surface-variant">UBICACIÓN</span>
              <span className="text-sm font-semibold text-on-surface">Cerca de ti</span>
            </div>
            <div className="bg-surface-container-highest/30 p-4 rounded-2xl flex flex-col gap-2">
              <span className="material-symbols-outlined text-primary">speed</span>
              <span className="text-xs font-bold text-on-surface-variant">TIEMPO</span>
              <span className="text-sm font-semibold text-on-surface">&lt; 15 mins</span>
            </div>
          </div>
        </div>
    return (
        <div className="text-on-surface antialiased overflow-x-hidden min-h-screen bg-surface-container-low">
            {/* TopAppBar */}
            <header className="fixed top-0 w-full z-50 bg-surface-container-low backdrop-blur-xl shadow-[0_32px_32px_rgba(0,105,76,0.04)]">
                <div className="flex items-center justify-between px-6 py-4 w-full">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={onBack}
                            aria-label="Volver"
                            className="text-primary active:scale-95 duration-200 p-2 hover:bg-primary/10 rounded-full focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                            <span aria-hidden="true" className="material-symbols-outlined font-bold">arrow_back</span>
                        </button>
                        <h1 className="font-headline font-bold text-xl tracking-tight text-primary">
                            Convertir a efectivo
                        </h1>
                    </div>
                    <div className="w-10"></div> {/* Spacer for symmetry */}
                </div>
                <div className="bg-outline-variant/30 h-[1px] w-full self-end"></div>
            </header>

            {/* Main Content Canvas */}
            <main className="pt-24 pb-32 px-6 flex flex-col min-h-screen max-w-md mx-auto">
                {/* Section: Input Header */}
                <div className="mt-8 mb-4">
                    <label htmlFor="cashout-amount" className="font-label text-xs font-bold tracking-[0.15em] text-on-surface-variant opacity-70">
                        ¿CUÁNTO QUIERES EN EFECTIVO?
                    </label>
                </div>

                {/* Section: Amount Input & Display */}
                <div className="relative group mb-8 py-10 px-4 bg-surface-container-lowest rounded-3xl shadow-sm border border-outline-variant/10 flex flex-col items-center">
                    <div className="flex items-center justify-center gap-3 w-full">
                        <span className="text-headline text-4xl font-extrabold text-on-surface">$</span>
                        <input
                            id="cashout-amount"
                            className="w-32 text-headline text-5xl font-extrabold text-on-surface bg-transparent border-none focus:ring-0 p-0 text-center"
                            placeholder="0"
                            type="text"
                            inputMode="numeric"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                        />
                        <span className="text-label text-xl font-bold text-primary px-3 py-1 bg-primary/5 rounded-lg">
                            MXN
                        </span>
                    </div>
                    {/* Availability Chip */}
                    <div className="mt-8 flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full border border-primary/10">
                        <span aria-hidden="true" className="material-symbols-outlined text-primary text-sm font-bold" style={{ fontVariationSettings: '"FILL" 1' }}>
                            account_balance_wallet
                        </span>
                        <span className="text-label text-[13px] font-bold text-primary">
                            Disponible: $1,240.00 MXN
                        </span>
                    </div>
                </div>

                {/* Section: Information & Bento Details */}
                <div className="space-y-6">
                    <div className="p-6 bg-surface-container-low rounded-2xl border-l-4 border-primary/20">
                        <div className="flex gap-4">
                            <span aria-hidden="true" className="material-symbols-outlined text-primary opacity-60">info</span>
                            <p className="text-body text-[14px] leading-relaxed text-on-surface-variant font-medium">
                                Ingresa el monto que deseas recibir. Buscaremos a los agentes verificados más cercanos con liquidez inmediata.
                            </p>
                        </div>
                    </div>
                    {/* Visual Context / Editorial Card */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-surface-container-highest/30 p-4 rounded-2xl flex flex-col gap-2">
                            <span aria-hidden="true" className="material-symbols-outlined text-primary">location_on</span>
                            <span className="text-xs font-bold text-on-surface-variant">UBICACIÓN</span>
                            <span className="text-sm font-semibold text-on-surface">Cerca de ti</span>
                        </div>
                        <div className="bg-surface-container-highest/30 p-4 rounded-2xl flex flex-col gap-2">
                            <span aria-hidden="true" className="material-symbols-outlined text-primary">speed</span>
                            <span className="text-xs font-bold text-on-surface-variant">TIEMPO</span>
                            <span className="text-sm font-semibold text-on-surface">&lt; 15 mins</span>
                        </div>
                    </div>
                </div>

                {/* Action Area */}
                <div className="mt-auto pt-10 pb-6">
                    <button
                        onClick={() => onSearch(Number(amount))}
                        aria-label="Buscar ofertas de efectivo"
                        className="w-full bg-gradient-to-r from-primary to-primary-container text-on-primary font-body font-semibold py-4 rounded-xl shadow-[0_12px_24px_rgba(0,105,76,0.2)] active:scale-95 duration-200 transition-all flex items-center justify-center gap-3 focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                        <span>Buscar ofertas de efectivo</span>
                        <span aria-hidden="true" className="material-symbols-outlined text-lg">search</span>
                    </button>
                </div>
            </main>

        <div className="mt-auto pt-10 pb-6">
          <button
            type="button"
            onClick={handleContinue}
            className="w-full bg-gradient-to-r from-primary to-primary-container text-on-primary font-body font-semibold py-4 rounded-xl shadow-[0_12px_24px_rgba(0,105,76,0.2)] active:scale-95 duration-200 transition-all flex items-center justify-center gap-3"
          >
            <span>Continuar</span>
            <span className="material-symbols-outlined text-lg">chevron_right</span>
          </button>
        </div>
      </main>

      <div className="fixed top-0 right-0 -z-10 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-32 -mt-32" />
      <div className="fixed bottom-0 left-0 -z-10 w-96 h-96 bg-primary-container/5 rounded-full blur-3xl -ml-48 -mb-48" />
    </div>
  );
}
