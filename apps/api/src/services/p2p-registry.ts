import { query, getOne, getMany } from '../db/schema.js';
import { getAgentHistory, upsertAgentHistory, AgentHistoryRow } from '../db/bazaar.js';

export type MerchantStatus = 'pending' | 'active' | 'suspended' | 'verified';
export type MerchantTier = 'espora' | 'activo' | 'experto' | 'maestro';
export type MerchantAvailability = 'online' | 'offline' | 'paused';

export interface Merchant {
  id: string;
  stellar_address: string;
  name: string;
  type: string;
  address: string;
  lat: number;
  lng: number;
  available_mxn: number;
  max_trade_mxn: number;
  min_trade_mxn: number;
  tier: MerchantTier;
  status: MerchantStatus;
  verified: boolean;
  completion_rate: number;
  trades_completed: number;
  trades_cancelled: number;
  volume_usdc: number;
  avg_time_minutes: number;
  online: boolean;
  availability: MerchantAvailability;
  created_at: string;
  updated_at: string;
}

export interface MerchantRegistration {
  stellar_address: string;
  name: string;
  type: string;
  address: string;
  lat: number;
  lng: number;
  max_trade_mxn: number;
  min_trade_mxn: number;
}

export interface MerchantFilters {
  online?: boolean;
  tier?: MerchantTier;
  lat?: number;
  lng?: number;
  radius_km?: number;
  status?: MerchantStatus;
  min_completion_rate?: number;
  type?: string;
}

interface MerchantRow {
  id: string;
  stellar_address: string;
  name: string;
  type: string;
  address: string;
  lat: string;
  lng: string;
  available_mxn: string;
  max_trade_mxn: string;
  min_trade_mxn: string;
  tier: string;
  status: string;
  verified: boolean;
  completion_rate: string;
  trades_completed: string;
  trades_cancelled: string;
  volume_usdc: string;
  avg_time_minutes: string;
  online: boolean;
  availability: string;
  created_at: string;
  updated_at: string;
}

const STELLAR_ADDRESS_REGEX = /^G[A-Z2-7]{55}$/;

export function isValidStellarAddress(address: string): boolean {
  if (!address || typeof address !== 'string') return false;
  if (!STELLAR_ADDRESS_REGEX.test(address)) return false;
  try {
    const { Keypair } = require('@stellar/stellar-sdk');
    Keypair.fromPublicKey(address);
    return true;
  } catch {
    return false;
  }
}

async function initMerchantsTable(): Promise<void> {
  await query(`
    CREATE TABLE IF NOT EXISTS p2p_merchants (
      id                VARCHAR(64) PRIMARY KEY,
      stellar_address   VARCHAR(56) UNIQUE NOT NULL,
      name              VARCHAR(255) NOT NULL,
      type              VARCHAR(64) NOT NULL,
      address           TEXT,
      lat               DECIMAL(10, 7),
      lng               DECIMAL(10, 7),
      available_mxn    DECIMAL(15, 2) NOT NULL DEFAULT 0,
      max_trade_mxn     DECIMAL(15, 2) NOT NULL DEFAULT 0,
      min_trade_mxn     DECIMAL(15, 2) NOT NULL DEFAULT 0,
      tier              VARCHAR(20) NOT NULL DEFAULT 'espora',
      status            VARCHAR(20) NOT NULL DEFAULT 'pending',
      verified          BOOLEAN NOT NULL DEFAULT FALSE,
      completion_rate   DECIMAL(5, 4) NOT NULL DEFAULT 0,
      trades_completed  INTEGER NOT NULL DEFAULT 0,
      trades_cancelled  INTEGER NOT NULL DEFAULT 0,
      volume_usdc       DECIMAL(20, 2) NOT NULL DEFAULT 0,
      avg_time_minutes  INTEGER NOT NULL DEFAULT 0,
      online            BOOLEAN NOT NULL DEFAULT FALSE,
      availability      VARCHAR(20) NOT NULL DEFAULT 'offline',
      created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT p2p_merchants_tier_check CHECK (tier IN ('espora', 'activo', 'experto', 'maestro')),
      CONSTRAINT p2p_merchants_status_check CHECK (status IN ('pending', 'active', 'suspended', 'verified')),
      CONSTRAINT p2p_merchants_availability_check CHECK (availability IN ('online', 'offline', 'paused'))
    );

    CREATE INDEX IF NOT EXISTS idx_p2p_merchants_stellar ON p2p_merchants(stellar_address);
    CREATE INDEX IF NOT EXISTS idx_p2p_merchants_status ON p2p_merchants(status);
    CREATE INDEX IF NOT EXISTS idx_p2p_merchants_tier ON p2p_merchants(tier);
    CREATE INDEX IF NOT EXISTS idx_p2p_merchants_online ON p2p_merchants(online);
    CREATE INDEX IF NOT EXISTS idx_p2p_merchants_location ON p2p_merchants(lat, lng);
  `);

  // Migration: add availability column if it doesn't exist yet
  await query(`
    ALTER TABLE p2p_merchants
    ADD COLUMN IF NOT EXISTS availability VARCHAR(20) NOT NULL DEFAULT 'offline'
      CONSTRAINT p2p_merchants_availability_check CHECK (availability IN ('online', 'offline', 'paused'))
  `).catch(() => {}); // ignore if constraint already exists
}

let tableInitialized = false;
async function ensureTable(): Promise<void> {
  if (!tableInitialized) {
    await initMerchantsTable();
    tableInitialized = true;
  }
}

function rowToMerchant(row: MerchantRow): Merchant {
  return {
    id: row.id,
    stellar_address: row.stellar_address,
    name: row.name,
    type: row.type,
    address: row.address || '',
    lat: parseFloat(row.lat),
    lng: parseFloat(row.lng),
    available_mxn: parseFloat(row.available_mxn),
    max_trade_mxn: parseFloat(row.max_trade_mxn),
    min_trade_mxn: parseFloat(row.min_trade_mxn),
    tier: row.tier as MerchantTier,
    status: row.status as MerchantStatus,
    verified: row.verified,
    completion_rate: parseFloat(row.completion_rate),
    trades_completed: parseInt(row.trades_completed, 10),
    trades_cancelled: parseInt(row.trades_cancelled, 10),
    volume_usdc: parseFloat(row.volume_usdc),
    avg_time_minutes: parseInt(row.avg_time_minutes, 10),
    online: row.online,
    availability: (row.availability ?? 'offline') as MerchantAvailability,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function calculateTier(history: AgentHistoryRow | null): MerchantTier {
  if (!history) return 'espora';

  const rate = history.broadcasts > 0
    ? history.swaps_completed / history.broadcasts
    : 0;

  if (history.swaps_completed >= 50 && rate >= 0.95) return 'maestro';
  if (history.swaps_completed >= 15 && rate >= 0.88) return 'experto';
  if (history.swaps_completed >= 3 && rate >= 0.75) return 'activo';
  return 'espora';
}

function calculateCompletionRate(history: AgentHistoryRow | null): number {
  if (!history || history.broadcasts === 0) return 0;
  return history.swaps_completed / history.broadcasts;
}

export async function registerMerchant(data: MerchantRegistration): Promise<Merchant> {
  await ensureTable();

  if (!isValidStellarAddress(data.stellar_address)) {
    throw new Error('Invalid Stellar address');
  }

  const existing = await getOne<MerchantRow>(
    'SELECT id FROM p2p_merchants WHERE stellar_address = $1',
    [data.stellar_address]
  );
  if (existing) {
    throw new Error('Merchant already registered');
  }

  const history = await getAgentHistory(data.stellar_address);
  const tier = calculateTier(history);
  const completionRate = calculateCompletionRate(history);

  const id = `mrc-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

  await query(`
    INSERT INTO p2p_merchants (
      id, stellar_address, name, type, address, lat, lng,
      max_trade_mxn, min_trade_mxn, tier, status, verified,
      completion_rate, trades_completed, trades_cancelled, volume_usdc
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending', FALSE, $11, $12, $13, $14)
  `, [
    id,
    data.stellar_address,
    data.name,
    data.type,
    data.address,
    data.lat,
    data.lng,
    data.max_trade_mxn,
    data.min_trade_mxn,
    tier,
    completionRate,
    history?.swaps_completed ?? 0,
    history?.swaps_cancelled ?? 0,
    history?.volume_usdc ?? 0,
  ]);

  if (!history) {
    await upsertAgentHistory(data.stellar_address, {});
  }

  const merchant = await getMerchant(id);
  if (!merchant) {
    throw new Error('Failed to create merchant');
  }
  return merchant;
}

export interface MerchantUpdates {
  name?: string;
  type?: string;
  address?: string;
  lat?: number;
  lng?: number;
  available_mxn?: number;
  max_trade_mxn?: number;
  min_trade_mxn?: number;
  online?: boolean;
  availability?: MerchantAvailability;
  avg_time_minutes?: number;
}

export async function updateMerchant(id: string, updates: MerchantUpdates): Promise<Merchant | null> {
  await ensureTable();

  const sets: string[] = ['updated_at = NOW()'];
  const values: any[] = [];
  let idx = 1;

  if (updates.name !== undefined) {
    sets.push(`name = $${idx++}`);
    values.push(updates.name);
  }
  if (updates.type !== undefined) {
    sets.push(`type = $${idx++}`);
    values.push(updates.type);
  }
  if (updates.address !== undefined) {
    sets.push(`address = $${idx++}`);
    values.push(updates.address);
  }
  if (updates.lat !== undefined) {
    sets.push(`lat = $${idx++}`);
    values.push(updates.lat);
  }
  if (updates.lng !== undefined) {
    sets.push(`lng = $${idx++}`);
    values.push(updates.lng);
  }
  if (updates.available_mxn !== undefined) {
    sets.push(`available_mxn = $${idx++}`);
    values.push(updates.available_mxn);
  }
  if (updates.max_trade_mxn !== undefined) {
    sets.push(`max_trade_mxn = $${idx++}`);
    values.push(updates.max_trade_mxn);
  }
  if (updates.min_trade_mxn !== undefined) {
    sets.push(`min_trade_mxn = $${idx++}`);
    values.push(updates.min_trade_mxn);
  }
  if (updates.online !== undefined) {
    sets.push(`online = $${idx++}`);
    values.push(updates.online);
  }
  if (updates.avg_time_minutes !== undefined) {
    sets.push(`avg_time_minutes = $${idx++}`);
    values.push(updates.avg_time_minutes);
  }

  values.push(id);
  await query(
    `UPDATE p2p_merchants SET ${sets.join(', ')} WHERE id = $${idx}`,
    values
  );

  return getMerchant(id);
}

export async function getMerchant(idOrAddress: string): Promise<Merchant | null> {
  await ensureTable();

  const row = idOrAddress.startsWith('G')
    ? await getOne<MerchantRow>(
        'SELECT * FROM p2p_merchants WHERE stellar_address = $1',
        [idOrAddress]
      )
    : await getOne<MerchantRow>(
        'SELECT * FROM p2p_merchants WHERE id = $1',
        [idOrAddress]
      );

  if (!row) return null;

  const merchant = rowToMerchant(row);
  const history = await getAgentHistory(merchant.stellar_address);

  if (history) {
    merchant.trades_completed = history.swaps_completed;
    merchant.trades_cancelled = history.swaps_cancelled;
    merchant.volume_usdc = history.volume_usdc;
    merchant.completion_rate = calculateCompletionRate(history);
    merchant.tier = calculateTier(history);
  }

  return merchant;
}

export async function listMerchants(filters: MerchantFilters = {}): Promise<Merchant[]> {
  await ensureTable();

  const conditions: string[] = ['1=1'];
  const values: any[] = [];
  let idx = 1;

  if (filters.online !== undefined) {
    conditions.push(`online = $${idx++}`);
    values.push(filters.online);
  }
  if (filters.tier) {
    conditions.push(`tier = $${idx++}`);
    values.push(filters.tier);
  }
  if (filters.status) {
    conditions.push(`status = $${idx++}`);
    values.push(filters.status);
  }
  if (filters.type) {
    conditions.push(`type = $${idx++}`);
    values.push(filters.type);
  }
  if (filters.min_completion_rate !== undefined) {
    conditions.push(`completion_rate >= $${idx++}`);
    values.push(filters.min_completion_rate);
  }

  let sql = `SELECT * FROM p2p_merchants WHERE ${conditions.join(' AND ')}`;

  if (filters.lat !== undefined && filters.lng !== undefined && filters.radius_km !== undefined) {
    sql = `
      SELECT *,
        (6371 * acos(
          cos(radians($${idx})) * cos(radians(lat)) *
          cos(radians(lng) - radians($${idx + 1})) +
          sin(radians($${idx})) * sin(radians(lat))
        )) AS distance
      FROM p2p_merchants
      WHERE ${conditions.join(' AND ')}
      HAVING (6371 * acos(
        cos(radians($${idx})) * cos(radians(lat)) *
        cos(radians(lng) - radians($${idx + 1})) +
        sin(radians($${idx})) * sin(radians(lat))
      )) <= $${idx + 2}
      ORDER BY distance ASC
    `;
    values.push(filters.lat, filters.lng, filters.radius_km);
    idx += 3;
  } else {
    sql += ' ORDER BY created_at DESC';
  }

  const rows = await getMany<MerchantRow & { distance?: string }>(sql, values);

  return rows.map(row => rowToMerchant(row));
}

export async function verifyMerchant(id: string): Promise<Merchant | null> {
  await ensureTable();

  await query(
    'UPDATE p2p_merchants SET verified = TRUE, status = $1, updated_at = NOW() WHERE id = $2',
    ['verified', id]
  );

  return getMerchant(id);
}

export async function getMerchantByStellarAddress(address: string): Promise<Merchant | null> {
  if (!isValidStellarAddress(address)) {
    return null;
  }
  return getMerchant(address);
}

export async function updateMerchantReputation(stellarAddress: string): Promise<void> {
  const history = await getAgentHistory(stellarAddress);
  if (!history) return;

  const tier = calculateTier(history);
  const completionRate = calculateCompletionRate(history);

  await query(`
    UPDATE p2p_merchants SET
      tier = $1,
      completion_rate = $2,
      trades_completed = $3,
      trades_cancelled = $4,
      volume_usdc = $5,
      updated_at = NOW()
    WHERE stellar_address = $6
  `, [
    tier,
    completionRate,
    history.swaps_completed,
    history.swaps_cancelled,
    history.volume_usdc,
    stellarAddress,
  ]);
}

export async function getActiveMerchantsForMatching(): Promise<Merchant[]> {
  return listMerchants({
    online: true,
    status: 'active',
  });
}

export { distanceKm } from './p2p.js';
export type { Provider, ScoredProvider, MatchRequest } from './p2p.js';
