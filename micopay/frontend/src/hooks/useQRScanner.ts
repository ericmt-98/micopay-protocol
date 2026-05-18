import { useCallback } from 'react';
import { Capacitor } from '@capacitor/core';

export interface ScanResult {
  value: string | null;
  error?: string;
}

export function useQRScanner() {
  const scan = useCallback(async (): Promise<ScanResult> => {
    if (!Capacitor.isNativePlatform()) {
      const value = window.prompt('QR scanner solo en device. Pega el payload manualmente:');
      return { value: value && value.trim() ? value.trim() : null };
    }

    const mod = await import('@capacitor-mlkit/barcode-scanning');
    const { BarcodeScanner, BarcodeFormat } = mod;

    const perm = await BarcodeScanner.requestPermissions();
    if (perm.camera !== 'granted' && perm.camera !== 'limited') {
      return { value: null, error: 'Permiso de cámara denegado' };
    }

    const supported = await BarcodeScanner.isSupported();
    if (!supported.supported) {
      return { value: null, error: 'Scanner no disponible en este device' };
    }

    try {
      const { barcodes } = await BarcodeScanner.scan({
        formats: [BarcodeFormat.QrCode],
      });
      return { value: barcodes[0]?.rawValue ?? null };
    } catch (e) {
      return { value: null, error: e instanceof Error ? e.message : 'Scan cancelado' };
    }
  }, []);

  return { scan };
}
