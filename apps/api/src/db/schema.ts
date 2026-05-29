import pg from 'pg';
const { Pool } = pg;
import { config } from '../config.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_FALLBACK_PATH = path.join(__dirname, '../../data/db_fallback.json');

let pool: pg.Pool | null = null;
let pgAvailable = false;

// ── In-memory store (fallback when PostgreSQL is unavailable) ─────────────
let mem: Record<string, any[]> = {
  users: [],
  wallets: [],
  auth_challenges: [],
  merchants: [],
  trades: [],
  bazaar_intents: [],
  bazaar_quotes: [],
  agent_history: [],
  x402_payments: [],
};

function loadMem() {
  try {
    if (fs.existsSync(DB_FALLBACK_PATH)) {
      const data = fs.readFileSync(DB_FALLBACK_PATH, 'utf-8');
      mem = JSON.parse(data);
      console.log('📦 Runtime persistence: Loaded data from disk');
    }
  } catch (err) {
    console.error('⚠️ Failed to load runtime persistence data:', err);
  }
}

function saveMem() {
  try {
    const dir = path.dirname(DB_FALLBACK_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DB_FALLBACK_PATH, JSON.stringify(mem, null, 2));
  } catch (err) {
    console.error('⚠️ Failed to save runtime persistence data:', err);
  }
}

function memNow() {
  return new Date().toISOString();
}

/** Resolve a value token: $N → params[N-1], NOW() → timestamp, NULL → null, 'str' → str */
function resolveVal(token: string, params: any[]): any {
  if (typeof token !== 'string') return token;
  const t = token.trim();
  const pMatch = t.match(/^\$(\d+)$/);
  if (pMatch) return params[parseInt(pMatch[1]) - 1];
  if (t.toUpperCase() === 'NOW()') return memNow();
  if (t.toUpperCase() === 'NULL') return null;
  const strMatch = t.match(/^'(.*)'$/s);
  if (strMatch) return strMatch[1];
  return t;
}

function colName(token: string) {
  return token.includes('.') ? token.split('.').pop()! : token;
}

function evalCondition(row: any, clause: string, params: any[]): boolean {
  const trimmed = clause.trim().replace(/^\((.+)\)$/, '$1');
  const eqMatch = trimmed.match(/^([\w.]+)\s*=\s*(.+)$/i);
  if (eqMatch) {
    const col = colName(eqMatch[1]);
    return row[col] === resolveVal(eqMatch[2], params);
  }
  return true;
}

function memQuery(sql: string, params: any[] = []): any[] {
  const s = sql.trim().replace(/\s+/g, ' ');
  const upper = s.toUpperCase();

  if (upper.startsWith('SELECT')) {
    const fromMatch = s.match(/\bFROM\s+([\w]+)/i);
    if (!fromMatch) return [];
    const tableName = fromMatch[1].toLowerCase();
    let rows = [...(mem[tableName] ?? [])];

    const whereMatch = s.match(/\bWHERE\b\s+(.+?)(?:\s+ORDER\s+BY|\s+LIMIT|$)/i);
    if (whereMatch) {
      rows = rows.filter(row => evalCondition(row, whereMatch[1], params));
    }
    return rows;
  }

  if (upper.startsWith('INSERT INTO')) {
    const tableMatch = s.match(/INSERT INTO\s+(\w+)\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)/i);
    if (!tableMatch) return [];
    const tableName = tableMatch[1].toLowerCase();
    const cols = tableMatch[2].split(',').map(c => c.trim());
    const vals = tableMatch[3].split(',').map(v => v.trim());

    const newRow: any = { id: crypto.randomUUID?.() || Math.random().toString(36).slice(2), created_at: memNow() };
    cols.forEach((col, i) => {
      newRow[col] = resolveVal(vals[i], params);
    });

    if (!mem[tableName]) mem[tableName] = [];
    mem[tableName].push(newRow);
    saveMem();

    return [newRow];
  }

  return [];
}

async function initPg() {
  try {
    const p = new Pool({
      connectionString: config.databaseUrl,
      connectionTimeoutMillis: 2000,
    });
    await p.query('SELECT 1');
    pool = p;
    pgAvailable = true;
    console.log('✅ PostgreSQL connected');

    // Run migrations
    const { runMigrations } = await import('./migrator.js');
    await runMigrations();
  } catch (err) {
    pgAvailable = false;
    console.warn('⚠️ PostgreSQL unavailable — using runtime persistence fallback');
    loadMem();
  }
}

// Initial connection attempt
initPg();

export async function query(text: string, params?: any[]) {
  if (pgAvailable && pool) return pool.query(text, params);
  return { rows: memQuery(text, params ?? []), rowCount: memQuery(text, params ?? []).length };
}

export async function getOne<T = any>(text: string, params?: any[]): Promise<T | null> {
  if (pgAvailable && pool) {
    const result = await pool.query(text, params);
    return result.rows[0] || null;
  }
  return (memQuery(text, params ?? [])[0] as T) || null;
}

export async function getMany<T = any>(text: string, params?: any[]): Promise<T[]> {
  if (pgAvailable && pool) {
    const result = await pool.query(text, params);
    return result.rows;
  }
  return memQuery(text, params ?? []) as T[];
}

export async function execute(text: string, params?: any[]) {
  if (pgAvailable && pool) return pool.query(text, params);
  memQuery(text, params ?? []);
  return { rowCount: 1, rows: [] };
}

export default { query, getOne, getMany, execute };
