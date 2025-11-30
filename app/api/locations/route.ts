import { NextRequest, NextResponse } from "next/server";
import { query } from "@/app/lib/mysql";
import type { LocationSearchResult } from "@/app/lib/types";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim() ?? "";

    const pageParam = searchParams.get("page");
    const pageSizeParam = searchParams.get("pageSize");

    const rawPage = Number(pageParam ?? "1");
    const rawPageSize = Number(
      pageSizeParam ?? searchParams.get("limit") ?? "50"
    );

    const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
    const pageSize =
      Number.isFinite(rawPageSize) && rawPageSize > 0 && rawPageSize <= 200
        ? rawPageSize
        : 50;
    const offset = (page - 1) * pageSize;

    if (!q) {
      return NextResponse.json({
        items: [],
        total: 0,
        page,
        pageSize,
      });
    }

    const sql = `
      SELECT
        l.id,
        l.Name,
        l.City,
        l.State,
        l.Zip,
        l.latitude,
        l.longitude,
        c.CustomerID,
        c.Name AS CompanyName,
        COUNT(DISTINCT e.id) AS EmployeeCount
      FROM locations l
      JOIN customers c
        ON c.CustomerID = l.customerid
      LEFT JOIN wotcemployee e
        ON e.LocationID = l.id
        AND e.Inactive = 0
      WHERE l.inactive = 0
        AND (
          l.Name LIKE ?
          OR l.City LIKE ?
          OR l.Zip LIKE ?
        )
      GROUP BY l.id, c.CustomerID
      ORDER BY l.Name
      LIMIT ${pageSize} OFFSET ${offset}
    `;

    const params: unknown[] = [`%${q}%`, `%${q}%`, `%${q}%`];

    const rows = await query<LocationSearchResult>(sql, params);

    const countSql = `
      SELECT COUNT(*) AS total
      FROM locations l
      JOIN customers c
        ON c.CustomerID = l.customerid
      WHERE l.inactive = 0
        AND (
          l.Name LIKE ?
          OR l.City LIKE ?
          OR l.Zip LIKE ?
        )
    `;

    const countRows = await query<{ total: number }>(countSql, params);
    const total = countRows[0]?.total ?? 0;

    return NextResponse.json({
      items: rows,
      total,
      page,
      pageSize,
    });
  } catch (err) {
    console.error("GET /api/locations error", err);
    return NextResponse.json(
      { error: "Failed to load locations" },
      { status: 500 }
    );
  }
}
