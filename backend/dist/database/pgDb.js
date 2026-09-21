"use strict";
/**
 * pgDb.ts — Adaptador PostgreSQL para MEVACOL
 *
 * Provee helper functions que reemplazan la API síncrona de better-sqlite3
 * con llamadas async/await a PostgreSQL vía `pg`.
 *
 * Conversión de placeholders: los módulos de rutas usan `?` al estilo SQLite.
 * Este adaptador los convierte automáticamente a `$1, $2, $3...` de PostgreSQL.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.pool = void 0;
exports.queryOne = queryOne;
exports.queryAll = queryAll;
exports.queryRun = queryRun;
exports.withTransaction = withTransaction;
exports.execRaw = execRaw;
const pg_1 = require("pg");
const config_1 = require("../config");
// Pool de conexiones singleton
exports.pool = new pg_1.Pool({
    connectionString: config_1.config.DATABASE_URL,
    ssl: config_1.config.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
});
exports.pool.on('error', (err) => {
    console.error('❌ Error inesperado en el pool de PostgreSQL:', err);
});
// ── Conversión de placeholders ────────────────────────────────────────────────
/**
 * Convierte marcadores `?` estilo SQLite a `$1, $2, $3...` de PostgreSQL.
 * También convierte `datetime('now')` y `date('now')` a NOW().
 */
function toPositional(sql, params) {
    // Reemplazar funciones de fecha de SQLite
    let text = sql
        .replace(/datetime\('now'\s*(?:,\s*'[^']*')*\)/gi, 'NOW()')
        .replace(/date\('now'\s*(?:,\s*'[^']*')*\)/gi, 'CURRENT_DATE')
        .replace(/date\(([^)]+)\)\s*=\s*CURRENT_DATE/gi, "SUBSTRING($1, 1, 10) = TO_CHAR(NOW(), 'YYYY-MM-DD')")
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
async function queryOne(sql, params) {
    const { text, values } = toPositional(sql, params);
    const result = await exports.pool.query(text, values);
    return result.rows[0];
}
// ── Helper: múltiples registros ───────────────────────────────────────────────
async function queryAll(sql, params) {
    const { text, values } = toPositional(sql, params);
    const result = await exports.pool.query(text, values);
    return result.rows;
}
// ── Helper: INSERT / UPDATE / DELETE (sin resultado) ─────────────────────────
async function queryRun(sql, params) {
    const { text, values } = toPositional(sql, params);
    await exports.pool.query(text, values);
}
// ── Helper: múltiples queries en una transacción atómica ─────────────────────
async function withTransaction(fn) {
    const client = await exports.pool.connect();
    try {
        await client.query('BEGIN');
        // Versiones locales que usan el cliente de la transacción
        const txQueryOne = async (sql, params) => {
            const { text, values } = toPositional(sql, params);
            const result = await client.query(text, values);
            return result.rows[0];
        };
        const txQueryAll = async (sql, params) => {
            const { text, values } = toPositional(sql, params);
            const result = await client.query(text, values);
            return result.rows;
        };
        const txQueryRun = async (sql, params) => {
            const { text, values } = toPositional(sql, params);
            await client.query(text, values);
        };
        const result = await fn({ queryOne: txQueryOne, queryAll: txQueryAll, queryRun: txQueryRun });
        await client.query('COMMIT');
        return result;
    }
    catch (err) {
        await client.query('ROLLBACK');
        throw err;
    }
    finally {
        client.release();
    }
}
// ── Helper: ejecutar SQL raw (para schema e inicialización) ───────────────────
async function execRaw(sql) {
    await exports.pool.query(sql);
}
