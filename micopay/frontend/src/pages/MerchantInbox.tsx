import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { useQRScanner } from '../hooks/useQRScanner';
import { PermissionGate } from '../components/PermissionGate';
import { PushPermissionBanner } from '../components/PushPermissionBanner';

interface Trade {
  id: string;
  buyer_handle: string;
  amount_mxn: number;
  status: string;
  created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  locked: 'bg-blue-100 text-blue-800',
  revealing: 'bg-purple-100 text-purple-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  refunded: 'bg-gray-100 text-gray-800',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  locked: 'Bloqueado',
  revealing: 'Revelando',
  completed: 'Completado',
  cancelled: 'Cancelado',
  refunded: 'Reembolsado',
};

interface MerchantInboxProps {
  token: string | null;
  onBack: () => void;
}

const isNative = Capacitor.isNativePlatform();

const MerchantInbox = ({ token, onBack }: MerchantInboxProps) => {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string>('all');

  // Scan state
  const [scanAreaOpen, setScanAreaOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scannedPayload, setScannedPayload] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [manualPayload, setManualPayload] = useState('');

  const { scan, permState, requestPermission, openSettings } = useQRScanner();

  const triggerScan = async () => {
    setIsScanning(true);
    setScanError(null);
    const result = await scan();
    setIsScanning(false);
    if (result.value) {
      setScannedPayload(result.value);
      setScanAreaOpen(false);
    } else if (result.error && result.error !== 'scanner_unavailable') {
      setScanError(result.error);
    }
    // If result.permState is denied/permanently_denied, permState in hook updates
    // and PermissionGate re-renders automatically
  };

  const handleScanClick = () => {
    setScanAreaOpen(true);
    setScanError(null);
    setScannedPayload(null);
    // On web: skip permission flow, manual paste shows directly
    // On native with known grant: scan immediately
    if (!isNative || permState === 'granted') {
      triggerScan();
    }
  };

  const handlePermissionRequest = async () => {
    const perm = await requestPermission();
    if (perm === 'granted') triggerScan();
  };

  const handleManualSubmit = () => {
    const trimmed = manualPayload.trim();
    if (!trimmed) return;
    setScannedPayload(trimmed);
    setManualPayload('');
    setScanAreaOpen(false);
  };

  const fetchTrades = async (state: string = 'all') => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/merchants/me/trades?state=${state}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setTrades(data.trades || []);
    } catch (e) {
      console.error('Failed to fetch merchant trades', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrades(activeFilter);
  }, [activeFilter, token]);

  // Re-check camera permission when app returns from system settings.
  useEffect(() => {
    if (!isNative) return;
    let removed = false;
    let handle: { remove: () => Promise<void> } | null = null;
    import('@capacitor/app').then(({ App }) => {
      if (removed) return;
      App.addListener('appStateChange', ({ isActive }) => {
        if (!isActive || !scanAreaOpen) return;
        requestPermission();
      }).then(h => { if (removed) h.remove(); else handle = h; });
    });
    return () => { removed = true; handle?.remove(); };
  }, [scanAreaOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const filters = [
    { key: 'all', label: 'Todos' },
    { key: 'pending', label: 'Pendientes' },
    { key: 'locked', label: 'Bloqueados' },
    { key: 'revealing', label: 'Revelando' },
    { key: 'completed', label: 'Completados' },
  ];

  const manualPasteFallback = (
    <div className="space-y-3 text-left">
      <p className="text-xs text-outline font-medium">
        Pega el payload del QR del cliente:
      </p>
      <textarea
        value={manualPayload}
        onChange={e => setManualPayload(e.target.value)}
        placeholder="micopay://claim?request_id=..."
        rows={3}
        className="w-full rounded-xl border border-outline/20 bg-surface-container-lowest p-3 text-xs font-mono resize-none focus:outline-none focus:border-primary"
      />
      <button
        onClick={handleManualSubmit}
        disabled={!manualPayload.trim()}
        className="w-full h-[44px] bg-primary/10 text-primary font-bold rounded-xl disabled:opacity-40 active:scale-95 transition-all text-sm"
      >
        Confirmar payload
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F4FAFF]">
      <header className="fixed top-0 left-0 w-full z-50 bg-white/90 backdrop-blur-md px-6 py-4 pt-[max(1rem,env(safe-area-inset-top))] flex items-center gap-4">
        <button onClick={onBack} className="material-symbols-outlined text-primary">arrow_back</button>
        <h1 className="font-headline font-bold text-lg flex-1">Bandeja de entrada</h1>
        <button
          onClick={handleScanClick}
          aria-label="Escanear QR del cliente"
          className="flex items-center gap-1 bg-primary text-white px-3 py-2 rounded-full text-xs font-bold shadow active:scale-95"
        >
          <span aria-hidden="true" className="material-symbols-outlined text-sm">qr_code_scanner</span>
          Escanear
        </button>
      </header>

      <main className="pt-24 px-6 pb-32">

        <PushPermissionBanner isMerchant={!!token} />

        {/* Result banner */}
        {(scannedPayload || scanError) && (
          <div className={`mb-4 rounded-2xl p-4 ${scanError ? 'bg-red-50 border border-red-200' : 'bg-emerald-50 border border-emerald-200'}`}>
            <div className="flex items-start gap-3">
              <span className={`material-symbols-outlined ${scanError ? 'text-red-600' : 'text-emerald-600'}`}>
                {scanError ? 'error' : 'qr_code_2'}
              </span>
              <div className="flex-1 min-w-0">
                {scanError ? (
                  <p className="text-sm text-red-800 font-medium">{scanError}</p>
                ) : (
                  <>
                    <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider mb-1">QR escaneado</p>
                    <p className="text-xs text-emerald-900 font-mono break-all">{scannedPayload}</p>
                  </>
                )}
              </div>
              <button
                onClick={() => { setScannedPayload(null); setScanError(null); }}
                aria-label="Cerrar"
                className="material-symbols-outlined text-on-surface-variant text-base"
              >
                close
              </button>
            </div>
          </div>
        )}

        {/* Scan area: permission gate + fallback */}
        {scanAreaOpen && (
          <div className="mb-4 rounded-2xl bg-white border border-surface-container-high shadow-sm overflow-hidden relative">
            <button
              onClick={() => setScanAreaOpen(false)}
              aria-label="Cerrar"
              className="absolute top-3 right-3 z-10 material-symbols-outlined text-outline text-base"
            >
              close
            </button>

            {/* Web: always show paste fallback (no camera API) */}
            {!isNative && (
              <div className="px-6 py-8">
                <p className="text-xs font-bold text-outline uppercase tracking-wider mb-4">Pega el QR manualmente</p>
                {manualPasteFallback}
              </div>
            )}

            {/* Native: show PermissionGate until granted, then scanning state */}
            {isNative && permState !== 'granted' && (
              <PermissionGate
                state={permState}
                onRequest={handlePermissionRequest}
                onOpenSettings={openSettings}
                title="Cámara para escanear QR"
                description="MicoPay necesita la cámara para leer el código QR del cliente y completar el intercambio."
                icon="photo_camera"
                fallback={manualPasteFallback}
              >
                {/* children never render here since permState !== 'granted' */}
                <></>
              </PermissionGate>
            )}

            {isNative && permState === 'granted' && isScanning && (
              <div className="flex items-center justify-center py-10 gap-3">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                <p className="text-sm text-outline">Escaneando…</p>
              </div>
            )}
          </div>
        )}

        {/* Filtros */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {filters.map(f => (
            <button
              key={f.key}
              onClick={() => setActiveFilter(f.key)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                activeFilter === f.key
                  ? 'bg-primary text-white'
                  : 'bg-white text-primary border border-primary'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : trades.length === 0 ? (
          <div className="text-center py-12">
            <span className="material-symbols-outlined text-6xl text-gray-300 mb-4">inbox</span>
            <p className="text-gray-500">No hay intercambios {activeFilter !== 'all' ? `con estado "${STATUS_LABELS[activeFilter]}"` : ''}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {trades.map(trade => (
              <div key={trade.id} className="bg-white rounded-2xl p-4 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-medium text-on-surface">{trade.buyer_handle}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(trade.created_at).toLocaleDateString('es-MX')}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[trade.status] || 'bg-gray-100'}`}>
                    {STATUS_LABELS[trade.status] || trade.status}
                  </span>
                </div>
                <p className="font-bold text-lg">${trade.amount_mxn} MXN</p>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default MerchantInbox;
