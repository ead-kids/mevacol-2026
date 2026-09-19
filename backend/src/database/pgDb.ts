/**
 * pgDb.ts — Adaptador PostgreSQL para MEVACOL
 *
 * Provee helper functions que reemplazan la API síncrona de better-sqlite3
 * con llamadas async/await a PostgreSQL vía `pg`.
 *
 * Conversión de placeholders: los módulos de rutas usan `?` al estilo SQLite.
 * Este adaptador los convierte automáticamente a `$1, $2, $3...` de PostgreSQL.
 */

import { Pool, PoolClient } from 'pg';
import { config } from '../config';

// Pool de conexiones singleton
export const pool = new Pool({
  connectionString: config.DATABASE_URL,
  ssl: config.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('❌ Error inesperado en el pool de PostgreSQL:', err);
});

// ── Conversión de placeholders ────────────────────────────────────────────────
/**
 * Convierte marcadores `?` estilo SQLite a `$1, $2, $3...` de PostgreSQL.
 * También convierte `datetime('now')` y `date('now')` a NOW().
 */
function toPositional(sql: string, params?: any[]): { text: string; values: any[] } {
  // Reemplazar funciones de fecha de SQLite
  let text = sql
    .replace(/datetime\('now'\s*(?:,\s*'[^']*')*\)/gi, 'NOW()')
    .replace(/date\('now'\s*(?:,\s*'[^']*')*\)/gi, 'CURRENT_DATE')
    .replace(/LIKE\s+\?/gi, (m) => m) // LIKE se mantiene (pg es case-insensitive con ILIKE pero LIKE funciona)
    ;

  if (!params || params.length === 0) {
    return { text, values: [] };
  }

  // Reemplazar cada `?` por `$n`
  let i = 0;
  text = text.replace(/\?/g, () => `$${++i}`);

  return { text, values: params };
}

// ── Helper: un solo registro ──────────────────────────────────────────────────
export async function queryOne<T = any>(sql: string, params?: any[]): Promise<T | undefined> {
  const { text, values } = toPositional(sql, params);
  const result = await pool.query(text, values);
  return result.rows[0] as T | undefined;
}

// ── Helper: múltiples registros ───────────────────────────────────────────────
export async function queryAll<T = any>(sql: string, params?: any[]): Promise<T[]> {
  const { text, values } = toPositional(sql, params);
  const result = await pool.query(text, values);
  return result.rows as T[];
}

// ── Helper: INSERT / UPDATE / DELETE (sin resultado) ─────────────────────────
export async function queryRun(sql: string, params?: any[]): Promise<void> {
  const { text, values } = toPositional(sql, params);
  await pool.query(text, values);
}

// ── Helper: múltiples queries en una transacción atómica ─────────────────────
export async function withTransaction<T>(
  fn: (helpers: {
    queryOne: typeof queryOne;
    queryAll: typeof queryAll;
    queryRun: (sql: string, params?: any[]) => Promise<void>;
  }) => Promise<T>
): Promise<T> {
  const client: PoolClient = await pool.connect();
  try {
    await client.query('BEGIN');

    // Versiones locales que usan el cliente de la transacción
    const txQueryOne = async <R = any>(sql: string, params?: any[]): Promise<R | undefined> => {
      const { text, values } = toPositional(sql, params);
      const result = await client.query(text, values);
      return result.rows[0] as R | undefined;
    };

    const txQueryAll = async <R = any>(sql: string, params?: any[]): Promise<R[]> => {
      const { text, values } = toPositional(sql, params);
      const result = await client.query(text, values);
      return result.rows as R[];
    };

    const txQueryRun = async (sql: string, params?: any[]): Promise<void> => {
      const { text, values } = toPositional(sql, params);
      await client.query(text, values);
    };

    const result = await fn({ queryOne: txQueryOne, queryAll: txQueryAll, queryRun: txQueryRun });

    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ── Helper: ejecutar SQL raw (para schema e inicialización) ───────────────────
export async function execRaw(sql: string): Promise<void> {
  await pool.query(sql);
}
