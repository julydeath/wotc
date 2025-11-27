// lib/mysql.ts
import mysql, { Pool } from "mysql2/promise";

let cachedPool: Pool | null = null;

export function getPool(): Pool {
  if (!cachedPool) {
    cachedPool = mysql.createPool({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT ?? 3306),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });
  }
  return cachedPool;
}

export async function query<T = any>(
  sql: string,
  params: any[] = []
): Promise<T[]> {
  const pool = getPool();
  const [rows] = await pool.execute(sql, params);
  return rows as T[];
}
