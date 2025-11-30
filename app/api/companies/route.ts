import { NextRequest, NextResponse } from "next/server";
import { query } from "@/app/lib/mysql";
import type { CompanySummary } from "@/app/lib/types";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim() ?? "";

    const pageParam = searchParams.get("page");
    const pageSizeParam = searchParams.get("pageSize");

    const isPaginated = pageParam !== null || pageSizeParam !== null;

    let sqlBase = `
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

    const params: unknown[] = [];

    if (q) {
      sqlBase += ` AND c.Name LIKE ?`;
      params.push(`%${q}%`);
    }

    if (!isPaginated) {
      const rawLimit = Number(searchParams.get("limit") ?? 50);
      const limit = Number.isFinite(rawLimit)
        ? Math.min(Math.max(rawLimit, 1), 100)
        : 50;

      const sql = `
        ${sqlBase}
        GROUP BY c.CustomerID, c.Name
        ORDER BY c.Name
        LIMIT ${limit}
      `;

      const rows = await query<CompanySummary>(sql, params);
      return NextResponse.json(rows);
    }

    const rawPage = Number(pageParam ?? "1");
    const rawPageSize = Number(pageSizeParam ?? "50");

    const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
    const pageSize =
      Number.isFinite(rawPageSize) && rawPageSize > 0 && rawPageSize <= 200
        ? rawPageSize
        : 50;

    const offset = (page - 1) * pageSize;

    const sql = `
      ${sqlBase}
      GROUP BY c.CustomerID, c.Name
      ORDER BY c.Name
      LIMIT ${pageSize} OFFSET ${offset}
    `;

    const rows = await query<CompanySummary>(sql, params);

    // total count of companies matching filter (no need for joins)
    let countSql = `
      SELECT COUNT(*) AS total
      FROM customers c
      WHERE c.Inactive = 0
    `;
    const countParams: unknown[] = [];
    if (q) {
      countSql += ` AND c.Name LIKE ?`;
      countParams.push(`%${q}%`);
    }

    const countRows = await query<{ total: number }>(countSql, countParams);
    const total = countRows[0]?.total ?? 0;

    return NextResponse.json({
      items: rows,
      total,
      page,
      pageSize,
    });
  } catch (err) {
    console.error("GET /api/companies error", err);
    return NextResponse.json(
      { error: "Failed to load companies" },
      { status: 500 }
    );
  }
}
