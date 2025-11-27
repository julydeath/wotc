import { NextRequest, NextResponse } from "next/server";
import { query } from "@/app/lib/mysql";
import type { CompanySummary } from "@/app/lib/types";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim() ?? "";

    const rawLimit = Number(searchParams.get("limit") ?? 50);
    const limit = Number.isFinite(rawLimit)
      ? Math.min(Math.max(rawLimit, 1), 100)
      : 50;

    let sql = `
      SELECT
        c.CustomerID,
        c.Name,
        COUNT(DISTINCT l.id) AS LocationCount,
        COUNT(DISTINCT e.id) AS EmployeeCount
      FROM customers c
      LEFT JOIN locations l
        ON l.customerid = c.CustomerID
        AND l.inactive = 0
      LEFT JOIN wotcemployee e
        ON e.LocationID = l.id
        AND e.Inactive = 0
      WHERE c.Inactive = 0
    `;

    const params: any[] = [];

    if (q) {
      sql += ` AND c.Name LIKE ?`;
      params.push(`%${q}%`);
    }

    sql += `
      GROUP BY c.CustomerID, c.Name
      ORDER BY c.Name
      LIMIT ${limit}
    `;

    const rows = await query<CompanySummary>(sql, params);

    return NextResponse.json(rows);
  } catch (err) {
    console.error("GET /api/companies error", err);
    return NextResponse.json(
      { error: "Failed to load companies" },
      { status: 500 }
    );
  }
}
