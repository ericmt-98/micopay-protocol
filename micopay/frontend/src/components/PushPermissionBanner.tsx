import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { usePushPermission } from '../hooks/usePermission';

interface PushPermissionBannerProps {
  /** Only show banner for merchants — users don't need push for the buyer flow */
  isMerchant: boolean;
}

export function PushPermissionBanner({ isMerchant }: PushPermissionBannerProps) {
  const { state, check, request, openSettings } = usePushPermission();
  const [dismissed, setDismissed] = useState(false);

  // Check current OS state on mount without showing any dialog
  useEffect(() => {
    if (isMerchant) check();
  }, [isMerchant]); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-check when app returns from system settings so banner updates automatically.
  useEffect(() => {
    if (!isMerchant) return;
    if (!Capacitor.isNativePlatform()) return;
    let removed = false;
    let handle: { remove: () => Promise<void> } | null = null;
    import('@capacitor/app').then(({ App }) => {
      if (removed) return;
      App.addListener('appStateChange', ({ isActive }) => {
        if (isActive) check();
      }).then(h => { if (removed) h.remove(); else handle = h; });
    });
    return () => { removed = true; handle?.remove(); };
  }, [isMerchant]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isMerchant || dismissed || state === 'granted' || state === 'unknown') return null;

  const isPermanent = state === 'permanently_denied';

  return (
    <div
      className={`mb-4 rounded-2xl p-4 border flex items-start gap-3 ${
        isPermanent
          ? 'bg-surface-container-low border-outline/20'
          : 'bg-primary/5 border-primary/20'
      }`}
      role="status"
      aria-live="polite"
    >
      <span
        className={`material-symbols-outlined text-xl shrink-0 mt-0.5 ${
          isPermanent ? 'text-outline' : 'text-primary'
        }`}
      >
        {isPermanent ? 'notifications_off' : 'notifications'}
      </span>

      <div className="flex-1 min-w-0">
        {state === 'prompt' && (
          <>
            <p className="text-sm font-bold text-on-surface">Activa las notificaciones</p>
            <p className="text-xs text-outline mt-0.5 leading-snug">
              Recibe alertas al instante cuando lleguen nuevos intercambios.
            </p>
            <button
              onClick={request}
              className="mt-2 px-4 py-1.5 bg-primary text-white text-xs font-bold rounded-full active:scale-95 transition-all"
            >
              Activar notificaciones
            </button>
          </>
        )}

        {state === 'denied' && (
          <>
            <p className="text-sm font-bold text-on-surface">Notificaciones desactivadas</p>
            <p className="text-xs text-outline mt-0.5 leading-snug">
              Tu bandeja sigue funcionando y muestra intercambios en tiempo real. Solo te perderás las alertas push.
            </p>
            <button
              onClick={request}
              className="mt-2 px-4 py-1.5 border border-primary text-primary text-xs font-bold rounded-full active:scale-95 transition-all"
            >
              Reintentar
            </button>
          </>
        )}

        {isPermanent && (
          <>
            <p className="text-sm font-bold text-on-surface">Notificaciones bloqueadas</p>
            <p className="text-xs text-outline mt-0.5 leading-snug">
              Tu bandeja sigue funcionando. Para alertas push, habilítalas en{' '}
              <span className="font-mono">Ajustes → Apps → MicoPay → Permisos</span>.
            </p>
            <button
              onClick={openSettings}
              className="mt-2 px-4 py-1.5 border border-outline/40 text-outline text-xs font-bold rounded-full active:scale-95 transition-all flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-xs">settings</span>
              Ir a Ajustes
            </button>
          </>
        )}
      </div>

      <button
        onClick={() => setDismissed(true)}
        aria-label="Descartar"
        className="material-symbols-outlined text-outline text-base shrink-0"
      >
        close
      </button>
    </div>
  );
}
