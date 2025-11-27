import { NextRequest, NextResponse } from "next/server";
import { query } from "@/app/lib/mysql";
import type { LocationSearchResult } from "@/app/lib/types";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim() ?? "";

    const rawLimit = Number(searchParams.get("limit") ?? 50);
    const limit = Number.isFinite(rawLimit)
      ? Math.min(Math.max(rawLimit, 1), 100)
      : 50;

    if (!q) {
      return NextResponse.json([]);
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
      LIMIT ${limit}
    `;

    const params = [`%${q}%`, `%${q}%`, `%${q}%`];

    const rows = await query<LocationSearchResult>(sql, params);

    return NextResponse.json(rows);
  } catch (err) {
    console.error("GET /api/locations error", err);
    return NextResponse.json(
      { error: "Failed to load locations" },
      { status: 500 }
    );
  }
}
