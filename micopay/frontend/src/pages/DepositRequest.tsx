/**
 * Deposit amount capture (issue #17) — mirrors cash-out bounds and confirmation-first routing.
 */
import { useState } from 'react';
import { TRADE_AMOUNT_MAX_MXN, TRADE_AMOUNT_MIN_MXN } from '../constants/trade';

export interface DepositRequestProps {
  onBack: () => void;
  amountStr: string;
  onAmountStrChange: (next: string) => void;
  onContinueToConfirmation: (amountMxn: number) => void;
}

function parseAmountMx(amountStr: string): number | null {
  const digits = amountStr.replace(/[^\d]/g, '');
  if (digits === '') return null;
  const n = Number.parseInt(digits, 10);
  return Number.isFinite(n) ? n : null;
}

export default function DepositRequest({
  onBack,
  amountStr,
  onAmountStrChange,
  onContinueToConfirmation,
}: DepositRequestProps) {
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
    <div className="bg-[#f4faff] min-h-screen text-on-surface font-body">
      <header className="w-full top-0 sticky bg-[#F4FAFF] shadow-[0px_32px_32px_rgba(11,30,38,0.04)] z-40 transition-colors duration-300">
        <div className="flex items-center justify-between px-6 py-4 w-full">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={onBack}
              className="text-[#00694C] hover:opacity-80 transition-opacity active:scale-95 duration-200"
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <div className="flex flex-col">
              <span className="font-headline font-extrabold text-[#00694C] tracking-tight text-xs uppercase opacity-60">
                MicoPay
              </span>
              <h1 className="font-headline font-bold text-xl text-[#00694C]">Depositar efectivo</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-6 pt-12 pb-24">
        <div className="flex flex-col space-y-8">
          <div className="space-y-6">
            <label className="font-medium text-[10px] tracking-wide uppercase text-on-surface-variant/70">
              ¿CUÁNTO QUIERES DEPOSITAR?
            </label>
            <div className="relative group">
              <div className="flex items-baseline space-x-2 border-b border-outline-variant/20 group-focus-within:border-primary transition-all duration-300 pb-2">
                <span className="text-4xl font-headline font-bold text-primary">$</span>
                <input
                  className="w-full bg-transparent border-none p-0 text-5xl font-headline font-extrabold text-on-surface focus:ring-0 placeholder:text-surface-container-highest"
                  placeholder="500"
                  type="text"
                  inputMode="numeric"
                  value={amountStr}
                  onChange={(e) => {
                    onAmountStrChange(e.target.value);
                    if (inlineError) setInlineError(null);
                  }}
                />
                <span className="text-xl font-headline font-bold text-on-surface-variant">MXN</span>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="px-3 py-1 bg-surface-container-low rounded-full">
                <p className="text-xs font-medium text-on-surface-variant">
                  Límites servidor:{' '}
                  <span className="text-primary font-bold">
                    ${TRADE_AMOUNT_MIN_MXN} – ${TRADE_AMOUNT_MAX_MXN.toLocaleString('es-MX')} MXN
                  </span>
                </p>
              </div>
            </div>
          </div>

          {inlineError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900" role="alert">
              {inlineError}
            </div>
          ) : null}

          <div className="bg-surface-container-lowest p-6 rounded-xl shadow-[0_8px_24px_rgba(11,30,38,0.02)] space-y-4">
            <div className="flex items-start space-x-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <span className="material-symbols-outlined text-primary">travel_explore</span>
              </div>
              <div className="flex-1">
                <p className="text-on-surface font-medium leading-relaxed">
                  Verás un resumen con comisión 0.8% y tiempo máximo antes de abrir el mapa.
                </p>
              </div>
            </div>
          </div>

          <div className="pt-8">
            <button
              type="button"
              onClick={handleContinue}
              className="w-full bg-[linear-gradient(135deg,#00694c_0%,#008560_100%)] text-white h-[56px] rounded-xl font-headline font-bold text-lg shadow-lg shadow-primary/20 active:scale-95 transition-all duration-200 flex items-center justify-center space-x-2"
            >
              <span>Continuar</span>
              <span className="material-symbols-outlined text-xl">chevron_right</span>
            </button>
          </div>
        </div>

        <div className="fixed -bottom-12 -right-12 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      </main>
    </div>
  );
}
