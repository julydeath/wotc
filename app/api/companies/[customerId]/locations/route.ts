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

    let sql = `
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

    const paramsSql: any[] = [customerId];

    if (q) {
      sql += `
        AND (
          l.Name  LIKE ?
          OR l.City LIKE ?
          OR l.State LIKE ?
          OR l.Zip  LIKE ?
        )
      `;
      paramsSql.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
    }

    sql += `
      GROUP BY l.id
      ORDER BY l.Name
    `;

    const rows = await query<LocationSummary>(sql, paramsSql);

    return NextResponse.json(rows);
  } catch (err) {
    console.error("GET /api/companies/[customerId]/locations error", err);
    return NextResponse.json(
      { error: "Failed to load locations" },
      { status: 500 }
    );
  }
}
