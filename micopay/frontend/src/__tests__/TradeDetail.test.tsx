import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import TradeDetail from '../pages/TradeDetail';
import * as api from '../services/api';

// Mock the API module
vi.mock('../services/api', () => ({
  completeTrade: vi.fn(),
  cancelTradeRequest: vi.fn(),
  fetchTradeDetail: vi.fn(),
}));

const mockFetchTradeDetail = vi.mocked(api.fetchTradeDetail);

const createMockTrade = (status: string) => ({
  trade: {
    id: 'trade-123',
    status,
    secret_hash: 'abc123',
    amount_mxn: 500,
    lock_tx_hash: status !== 'pending' ? 'mock_lock_hash' : null,
    release_tx_hash: status === 'completed' ? 'mock_release_hash' : null,
    created_at: '2024-01-01T10:00:00Z',
    completed_at: status === 'completed' ? '2024-01-01T10:30:00Z' : null,
    expires_at: '2024-01-01T12:00:00Z',
    seller_id: 'seller-1',
    buyer_id: 'buyer-1',
  },
  merchant_unavailable: false,
  seller_username: 'seller',
});

const renderWithRouter = (route: string = '/trade/trade-123', isAuthenticated = true) => {
  if (isAuthenticated) {
    localStorage.setItem(
      'micopay_users',
      JSON.stringify({
        buyer: { id: 'buyer-1', token: 'mock-token', username: 'test' },
        seller: { id: 'seller-1', token: 'mock-token', username: 'test' },
      }),
    );
  } else {
    localStorage.removeItem('micopay_users');
  }

  return render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path="/trade/:id" element={<TradeDetail />} />
        <Route path="/login" element={<div>Login Page</div>} />
        <Route path="/" element={<div>Home Page</div>} />
      </Routes>
    </MemoryRouter>,
  );
};

describe('TradeDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('Route registration', () => {
    it('should render TradeDetail when navigating to /trade/:id', async () => {
      mockFetchTradeDetail.mockResolvedValue(createMockTrade('pending'));

      renderWithRouter('/trade/test-trade-id');

      await waitFor(() => {
        expect(screen.getByText(/cargando operación/i)).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getByText(/detalle de operación/i)).toBeInTheDocument();
      });
    });

    it('should correctly read trade ID from URL params', async () => {
      mockFetchTradeDetail.mockResolvedValue(createMockTrade('pending'));

      renderWithRouter('/trade/unique-trade-456');

      await waitFor(() => {
        expect(mockFetchTradeDetail).toHaveBeenCalledWith('unique-trade-456', 'mock-token');
      });
    });
  });

  describe('State rendering', () => {
    it('should render pending state with cancel button', async () => {
      mockFetchTradeDetail.mockResolvedValue(createMockTrade('pending'));

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText('Pendiente')).toBeInTheDocument();
        expect(screen.getByText(/esperando al vendedor/i)).toBeInTheDocument();
        expect(screen.getByText(/cancelar operación/i)).toBeInTheDocument();
      });
    });

    it('should render locked state with chat button', async () => {
      mockFetchTradeDetail.mockResolvedValue(createMockTrade('locked'));

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText('Bloqueado')).toBeInTheDocument();
        expect(screen.getByText(/fondos bloqueados/i)).toBeInTheDocument();
        expect(screen.getByText(/abrir chat con el vendedor/i)).toBeInTheDocument();
      });
    });

    it('should render revealing state with QR button', async () => {
      mockFetchTradeDetail.mockResolvedValue(createMockTrade('revealing'));

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText('Revelando')).toBeInTheDocument();
        expect(screen.getByText(/mostrar tu qr/i)).toBeInTheDocument();
        expect(screen.getByText(/ver mi qr de intercambio/i)).toBeInTheDocument();
      });
    });

    it('should render revealed state with confirm button', async () => {
      mockFetchTradeDetail.mockResolvedValue(createMockTrade('revealed'));

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText('Revelado')).toBeInTheDocument();
        expect(screen.getByText(/confirmar recepción/i)).toBeInTheDocument();
        expect(screen.getByText(/ya recibí el efectivo/i)).toBeInTheDocument();
      });
    });

    it('should render completed state with summary', async () => {
      mockFetchTradeDetail.mockResolvedValue(createMockTrade('completed'));

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText('Completado')).toBeInTheDocument();
        expect(screen.getByText(/operación completada/i)).toBeInTheDocument();
        expect(screen.getByText(/volver al inicio/i)).toBeInTheDocument();
      });
    });

    it('should render cancelled state', async () => {
      mockFetchTradeDetail.mockResolvedValue(createMockTrade('cancelled'));

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText('Cancelado')).toBeInTheDocument();
        expect(screen.getByText(/operación cancelada/i)).toBeInTheDocument();
        expect(screen.getByText(/volver al inicio/i)).toBeInTheDocument();
      });
    });

    it('should render expired state', async () => {
      mockFetchTradeDetail.mockResolvedValue(createMockTrade('expired'));

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText('Expirado')).toBeInTheDocument();
        expect(screen.getByText(/operación expirada/i)).toBeInTheDocument();
        expect(screen.getByText(/volver al inicio/i)).toBeInTheDocument();
      });
    });
  });

  describe('Error handling', () => {
    it('should show 404 screen when trade is not found', async () => {
      const error = new Error('Not found');
      (error as any).response = { status: 404 };
      mockFetchTradeDetail.mockRejectedValue(error);

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText(/trade no encontrado/i)).toBeInTheDocument();
        expect(screen.getByText(/volver al inicio/i)).toBeInTheDocument();
      });
    });

    it('should show 403 screen when user is not a participant', async () => {
      const error = new Error('Forbidden');
      (error as any).response = { status: 403 };
      mockFetchTradeDetail.mockRejectedValue(error);

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText(/sin acceso/i)).toBeInTheDocument();
        expect(screen.getByText(/no tienes permiso/i)).toBeInTheDocument();
        expect(screen.getByText(/volver al inicio/i)).toBeInTheDocument();
      });
    });

    it('should show network error with retry button on connection failure', async () => {
      const error = new Error('Network error');
      (error as any).response = { status: 500 };
      mockFetchTradeDetail.mockRejectedValue(error);

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText(/error de conexión/i)).toBeInTheDocument();
        expect(screen.getByText(/reintentar/i)).toBeInTheDocument();
      });
    });
  });

  describe('Auth recovery', () => {
    it('should redirect to login when not authenticated and save redirect path', async () => {
      renderWithRouter('/trade/trade-123', false);

      await waitFor(() => {
        expect(screen.getByText('Login Page')).toBeInTheDocument();
        expect(localStorage.getItem('pendingTradeRedirect')).toBe('/trade/trade-123');
      });
    });

    it('should not redirect when user is authenticated', async () => {
      mockFetchTradeDetail.mockResolvedValue(createMockTrade('pending'));

      renderWithRouter('/trade/trade-123', true);

      await waitFor(() => {
        expect(screen.getByText(/detalle de operación/i)).toBeInTheDocument();
        expect(screen.queryByText('Login Page')).not.toBeInTheDocument();
      });
    });
  });

  describe('Support link visibility', () => {
    const states = ['pending', 'locked', 'revealing', 'revealed'];

    states.forEach((state) => {
      it(`should show support link in ${state} state`, async () => {
        mockFetchTradeDetail.mockResolvedValue(createMockTrade(state));

        renderWithRouter();

        await waitFor(() => {
          expect(screen.getByText(/¿necesitas ayuda\?/i)).toBeInTheDocument();
          expect(screen.getByText(/contactar soporte/i)).toBeInTheDocument();
        });
      });
    });

    it('should not show support link in completed state', async () => {
      mockFetchTradeDetail.mockResolvedValue(createMockTrade('completed'));

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText(/operación completada/i)).toBeInTheDocument();
        expect(screen.queryByText(/¿necesitas ayuda\?/i)).not.toBeInTheDocument();
      });
    });

    it('should show support link in 404 error state', async () => {
      const error = new Error('Not found');
      (error as any).response = { status: 404 };
      mockFetchTradeDetail.mockRejectedValue(error);

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText(/contactar soporte/i)).toBeInTheDocument();
      });
    });

    it('should show support link in 403 error state', async () => {
      const error = new Error('Forbidden');
      (error as any).response = { status: 403 };
      mockFetchTradeDetail.mockRejectedValue(error);

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText(/contactar soporte/i)).toBeInTheDocument();
      });
    });
  });
});
