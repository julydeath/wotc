import { NextRequest, NextResponse } from "next/server";
import { query } from "@/app/lib/mysql";
import type { LocationSummary } from "@/app/lib/types";

type Params = Promise<{ customerId: string }>;

export async function GET(req: NextRequest, { params }: { params: Params }) {
  try {
    const customerId = Number((await params).customerId);
    if (!customerId || Number.isNaN(customerId)) {
      return NextResponse.json(
        { error: "Invalid customerId" },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim() ?? "";

    const pageParam = searchParams.get("page");
    const pageSizeParam = searchParams.get("pageSize");
    const isPaginated = pageParam !== null || pageSizeParam !== null;

    let sqlBase = `
      SELECT
        l.id,
        l.Name,
        l.City,
        l.State,
        l.Zip,
        l.latitude,
        l.longitude,
        COUNT(DISTINCT e.id) AS EmployeeCount,
        COALESCE(SUM(w.amount), 0) AS TotalWages,
        COALESCE(SUM(w.hours), 0) AS TotalHours
      FROM locations l
      LEFT JOIN wotcemployee e
        ON e.LocationID = l.id
        AND e.Inactive = 0
      LEFT JOIN wotcwages w
        ON w.employeeid = e.id
      WHERE l.customerid = ?
        AND l.inactive = 0
    `;

    const paramsSql: unknown[] = [customerId];

    if (q) {
      sqlBase += `
        AND (
          l.Name  LIKE ?
          OR l.City LIKE ?
          OR l.State LIKE ?
          OR l.Zip  LIKE ?
        )
      `;
      paramsSql.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
    }

    if (!isPaginated) {
      const sql = `
        ${sqlBase}
        GROUP BY l.id
        ORDER BY l.Name
      `;

      const rows = await query<LocationSummary>(sql, paramsSql);
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
      GROUP BY l.id
      ORDER BY l.Name
      LIMIT ${pageSize} OFFSET ${offset}
    `;

    const rows = await query<LocationSummary>(sql, paramsSql);

    // separate count query (no joins needed)
    let countSql = `
      SELECT COUNT(*) AS total
      FROM locations l
      WHERE l.customerid = ?
        AND l.inactive = 0
    `;
    const countParams: unknown[] = [customerId];

    if (q) {
      countSql += `
        AND (
          l.Name  LIKE ?
          OR l.City LIKE ?
          OR l.State LIKE ?
          OR l.Zip  LIKE ?
        )
      `;
      countParams.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
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
    console.error("GET /api/companies/[customerId]/locations error", err);
    return NextResponse.json(
      { error: "Failed to load locations" },
      { status: 500 }
    );
  }
}
