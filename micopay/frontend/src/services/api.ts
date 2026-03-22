import axios from 'axios';

const BASE_URL = (import.meta as any).env?.VITE_API_URL ?? 'http://localhost:3000';

const http = axios.create({ baseURL: BASE_URL });

function authHeaders(token: string) {
  return { headers: { Authorization: `Bearer ${token}` } };
}

function randomAddress(prefix: string): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let address = 'G' + prefix.toUpperCase().replace(/[^A-Z2-7]/g, 'A');
  while (address.length < 56) {
    address += chars[Math.floor(Math.random() * chars.length)];
  }
  return address.substring(0, 56);
}

export interface UserData {
  id: string;
  username: string;
  token: string;
}

export interface TradeData {
  id: string;
  status: string;
  secret_hash: string;
  amount_mxn: number;
}

export async function registerUser(username: string): Promise<UserData> {
  const stellar_address = randomAddress(username.substring(0, 6));
  const res = await http.post('/users/register', { username, stellar_address });
  return { ...res.data.user, token: res.data.token };
}

export async function createTrade(
  sellerId: string,
  amountMxn: number,
  buyerToken: string,
): Promise<TradeData> {
  const res = await http.post(
    '/trades',
    { seller_id: sellerId, amount_mxn: amountMxn },
    authHeaders(buyerToken),
  );
  return res.data.trade;
}

export async function lockTrade(tradeId: string, sellerToken: string): Promise<{ lock_tx_hash: string }> {
  const stellar_trade_id = `mock_${Date.now()}`;
  const lock_tx_hash = `tx_${Date.now()}`;
  await http.post(
    `/trades/${tradeId}/lock`,
    { stellar_trade_id, lock_tx_hash },
    authHeaders(sellerToken),
  );
  return { lock_tx_hash };
}

export async function revealTrade(tradeId: string, sellerToken: string): Promise<void> {
  await http.post(`/trades/${tradeId}/reveal`, undefined, authHeaders(sellerToken));
}

export async function getSecret(
  tradeId: string,
  sellerToken: string,
): Promise<{ secret: string; qr_payload: string }> {
  const res = await http.get(`/trades/${tradeId}/secret`, authHeaders(sellerToken));
  return res.data;
}

export async function completeTrade(tradeId: string, buyerToken: string): Promise<void> {
  await http.post(
    `/trades/${tradeId}/complete`,
    { release_tx_hash: `tx_complete_${Date.now()}` },
    authHeaders(buyerToken),
  );
}
