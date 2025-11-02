import { Pool } from 'pg';

// Create a PostgreSQL connection pool
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'iot',
  user: process.env.DB_USER || 'emqx',
  password: process.env.DB_PASSWORD || 'emqxpass',
});

export interface BtcTick {
  id: number;
  ts: string;
  symbol: string;
  price: string;
  raw: any;
  topic: string;
  clientid: string | null;
}

export interface DailyStats {
  current_price: string;
  high: string;
  low: string;
  variation: string;
  variation_percent: string;
}

export async function getLatestTicks(limit: number = 10): Promise<BtcTick[]> {
  const result = await pool.query(
    `SELECT
      id,
      ts,
      symbol,
      price::text,
      raw,
      topic,
      clientid
    FROM btc_ticks
    ORDER BY ts DESC
    LIMIT $1`,
    [limit]
  );
  return result.rows;
}

export async function getTodayTicks(): Promise<BtcTick[]> {
  const result = await pool.query(
    `SELECT
      id,
      ts,
      symbol,
      price::text,
      raw,
      topic,
      clientid
    FROM btc_ticks
    WHERE ts >= CURRENT_DATE
    ORDER BY ts ASC`
  );
  return result.rows;
}

export async function getDailyStats(): Promise<DailyStats | null> {
  const result = await pool.query(
    `SELECT
      (SELECT price::text FROM btc_ticks ORDER BY ts DESC LIMIT 1) as current_price,
      MAX(price)::text as high,
      MIN(price)::text as low,
      (MAX(price) - MIN(price))::text as variation,
      CASE
        WHEN MIN(price) > 0 THEN
          ((MAX(price) - MIN(price)) / MIN(price) * 100)::text
        ELSE '0'
      END as variation_percent
    FROM btc_ticks
    WHERE ts >= CURRENT_DATE`
  );

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0];
}

export default pool;
