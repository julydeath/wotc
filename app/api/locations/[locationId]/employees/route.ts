import { NextRequest, NextResponse } from "next/server";
import { query } from "@/app/lib/mysql";
import type { EmployeeSummary } from "@/app/lib/types";

type Params = Promise<{ locationId: string }>;

export async function GET(req: NextRequest, { params }: { params: Params }) {
  try {
    const locationId = (await params).locationId;
    console.log("locationId:", locationId);
    if (!locationId || Number.isNaN(locationId)) {
      return NextResponse.json(
        { error: "Invalid locationId" },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim() ?? "";

    const rawLimit = Number(searchParams.get("limit") ?? 200);
    const limit = Number.isFinite(rawLimit)
      ? Math.min(Math.max(rawLimit, 1), 500)
      : 200;

    let sql = `
      SELECT
        e.id,
        e.FirstName,
        e.LastName,
        e.SSN,
        e.datehired,
        e.termdate,
        e.Inactive,
        COALESCE(SUM(w.amount), 0) AS TotalWages,
        COALESCE(SUM(w.hours), 0) AS TotalHours,
        MAX(cr.CertifiedDate) AS LatestCertifiedDate,
        MAX(cr.DeniedDate) AS LatestDeniedDate
      FROM wotcemployee e
      LEFT JOIN wotcwages w
        ON w.employeeid = e.id
      LEFT JOIN wotcempcredits cr
        ON cr.EmpID = e.id
      WHERE e.LocationID = ?
    `;

    const paramsSql: any[] = [locationId];

    if (q) {
      sql += `
        AND (
          CONCAT(e.FirstName, ' ', e.LastName) LIKE ?
          OR e.SSN LIKE ?
        )
      `;
      paramsSql.push(`%${q}%`, `%${q}%`);
    }

    sql += `
      GROUP BY e.id
      ORDER BY e.LastName, e.FirstName
      LIMIT ${limit}
    `;

    const rows = await query<EmployeeSummary>(sql, paramsSql);

    return NextResponse.json(rows);
  } catch (err) {
    console.error("GET /api/locations/[locationId]/employees error", err);
    return NextResponse.json(
      { error: "Failed to load employees" },
      { status: 500 }
    );
  }
}
