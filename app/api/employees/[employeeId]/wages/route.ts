// app/api/employees/[employeeId]/wages/route.ts
import { NextRequest, NextResponse } from "next/server";
import { query } from "@/app/lib/mysql";
import type { EmployeeWage } from "@/app/lib/types";

type Params = Promise<{ employeeId: string }>;

export async function GET(req: NextRequest, { params }: { params: Params }) {
  try {
    const employeeId = Number((await params).employeeId);
    if (!employeeId || Number.isNaN(employeeId)) {
      return NextResponse.json(
        { error: "Invalid employeeId" },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from")?.trim() || null; // YYYY-MM-DD
    const to = searchParams.get("to")?.trim() || null; // YYYY-MM-DD

    const rawLimit = Number(searchParams.get("limit") ?? 200);
    const limit = Number.isFinite(rawLimit)
      ? Math.min(Math.max(rawLimit, 1), 1000)
      : 200;

    let sql = `
      SELECT
        id,
        fromdate,
        todate,
        amount,
        hours,
        conid
      FROM wotcwages
      WHERE employeeid = ?
    `;

    const paramsSql: any[] = [employeeId];

    if (from) {
      sql += ` AND fromdate >= ?`;
      paramsSql.push(from);
    }

    if (to) {
      sql += ` AND todate <= ?`;
      paramsSql.push(to);
    }

    sql += `
      ORDER BY fromdate
      LIMIT ${limit}
    `;

    const rows = await query<EmployeeWage>(sql, paramsSql);

    return NextResponse.json(rows);
  } catch (err) {
    console.error("GET /api/employees/[employeeId]/wages error", err);
    return NextResponse.json(
      { error: "Failed to load wages" },
      { status: 500 }
    );
  }
}
