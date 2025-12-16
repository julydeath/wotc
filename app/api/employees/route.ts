import { NextRequest, NextResponse } from "next/server";
import { query } from "@/app/lib/mysql";
import type { EmployeeRecord, PaginatedResult } from "@/app/lib/types";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const from = searchParams.get("from");
    const to = searchParams.get("to");

    if (!from || !to) {
      return NextResponse.json(
        {
          error:
            "Missing 'from' or 'to'. Pass both as query params (e.g. ?from=2025-01-01&to=2025-12-31).",
        },
        { status: 400 }
      );
    }

    const rawPage = Number(searchParams.get("page") ?? "1");
    const rawPageSize = Number(searchParams.get("pageSize") ?? "100");

    const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
    const pageSize =
      Number.isFinite(rawPageSize) && rawPageSize > 0 && rawPageSize <= 500
        ? rawPageSize
        : 100;

    const offset = (page - 1) * pageSize;

    const sql = `
      SELECT *
      FROM wotcemployee
      WHERE datehired BETWEEN ? AND ?
      ORDER BY datehired
      LIMIT ${pageSize} OFFSET ${offset}
    `;

    const rows = await query<EmployeeRecord>(sql, [from, to]);

    const countSql = `
      SELECT COUNT(*) AS total
      FROM wotcemployee
      WHERE datehired BETWEEN ? AND ?
    `;
    const countRows = await query<{ total: number }>(countSql, [from, to]);
    const total = countRows[0]?.total ?? 0;

    const result: PaginatedResult<EmployeeRecord> = {
      items: rows,
      total,
      page,
      pageSize,
    };

    return NextResponse.json(result);
  } catch (err) {
    console.error("GET /api/employees error", err);
    return NextResponse.json(
      { error: "Failed to load employees" },
      { status: 500 }
    );
  }
}

