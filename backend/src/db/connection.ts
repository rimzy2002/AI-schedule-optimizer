import mysql from "mysql2/promise";
import { env } from "@/config/env.js";

/**
 * Connection pool, not a single connection.
 *
 * A single shared connection means concurrent requests serialize on
 * MySQL round-trips — request B waits for request A's query to fully
 * complete before it can even send its own. A pool lets N requests
 * run their queries genuinely concurrently, each on its own connection
 * checked out from the pool and returned when done.
 *
 * DB_POOL_MAX defaults to 10: for a solo-dev MVP with modest concurrent
 * traffic, 10 connections is enough headroom without exhausting
 * MySQL's default max_connections (151) if you spin up multiple
 * backend instances later. Raise this only alongside a matching bump
 * to MySQL's own max_connections — a pool larger than the DB server
 * allows just produces connection-refused errors under load.
 */
export const pool = mysql.createPool({
  host: env.DB_HOST,
  port: env.DB_PORT,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  waitForConnections: true,
  connectionLimit: env.DB_POOL_MAX,
  queueLimit: 0, // 0 = unbounded queue of callers waiting for a free
  // connection, rather than immediately rejecting. Under sustained
  // overload this means requests queue and slow down rather than
  // hard-fail — acceptable for an MVP; revisit if you need backpressure
  // (rejecting fast) instead of queuing (waiting) once you have real
  // traffic data.

  // NOTE: mysql2's `timezone` option does NOT issue SET time_zone on
  // the connection — it only controls how mysql2 serializes/parses JS
  // Date objects on the client side. Verified this the hard way: with
  // only this option set, a connection still inherited a deliberately
  // misconfigured MySQL global default instead of using UTC. The `on
  // connection` hook below is what actually enforces UTC at the
  // session level — do not remove it and do not assume this option
  // alone is sufficient.
  timezone: "+00:00",

  // Returns DECIMAL columns (estimated_hours, weight_percent) as JS
  // numbers instead of strings. mysql2 defaults to strings for DECIMAL
  // to avoid floating-point precision loss on very large values — not
  // a concern here (estimated_hours maxes out around a few hundred),
  // so we trade that theoretical precision for a strongly-typed
  // number in application code instead of manual parseFloat() calls
  // scattered across services.
  decimalNumbers: true,
});

/**
 * CRITICAL, ACTUALLY-ENFORCING UTC PIN.
 *
 * Fires once per physical connection when the pool creates it (not
 * once per query — pooled connections are reused across many
 * queries, so this must be a "connection" event listener, not
 * something run per-request). Forces every connection in this pool
 * to report and operate in UTC regardless of the MySQL server's
 * global `time_zone` setting.
 *
 * This is the ONLY thing that actually enforces UTC session-side —
 * confirmed by testing: without this, a connection silently inherits
 * whatever the MySQL server's global time_zone happens to be.
 */
pool.on("connection", (connection: any) => {
  connection.query("SET time_zone = '+00:00'");
});

/**
 * Call this once at server startup (see server.ts) to fail fast if the
 * database is unreachable, rather than discovering it on the first
 * incoming request.
 */
export async function verifyDbConnection(): Promise<void> {
  const connection = await pool.getConnection();
  try {
    await connection.query("SELECT 1");
  } finally {
    connection.release();
  }
}
