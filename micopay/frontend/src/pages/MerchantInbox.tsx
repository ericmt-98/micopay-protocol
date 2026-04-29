import { useState, useEffect } from 'react';

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

const MerchantInbox = ({ token, onBack }: MerchantInboxProps) => {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string>('all');

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

  const filters = [
    { key: 'all', label: 'Todos' },
    { key: 'pending', label: 'Pendientes' },
    { key: 'locked', label: 'Bloqueados' },
    { key: 'revealing', label: 'Revelando' },
    { key: 'completed', label: 'Completados' },
  ];

  return (
    <div className="min-h-screen bg-[#F4FAFF]">
      <header className="fixed top-0 left-0 w-full z-50 bg-white/90 backdrop-blur-md px-6 py-4 flex items-center gap-4">
        <button onClick={onBack} className="material-symbols-outlined text-primary">arrow_back</button>
        <h1 className="font-headline font-bold text-lg">Bandeja de entrada</h1>
      </header>

      <main className="pt-20 px-6 pb-32">
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
