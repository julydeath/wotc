import { NextRequest, NextResponse } from "next/server";
import { query } from "@/app/lib/mysql";
import type { EmployeeRecord } from "@/app/lib/types";

type Params = Promise<{ employeeId: string }>;

export async function GET(_req: NextRequest, { params }: { params: Params }) {
  try {
    const employeeId = Number((await params).employeeId);
    if (!employeeId || Number.isNaN(employeeId)) {
      return NextResponse.json(
        { error: "Invalid employeeId" },
        { status: 400 }
      );
    }

    const sql = `
      SELECT *
      FROM wotcemployee
      WHERE id = ?
      LIMIT 1
    `;

    const rows = await query<EmployeeRecord>(sql, [employeeId]);
    const employee = rows[0] ?? null;

    return NextResponse.json(employee);
  } catch (err) {
    console.error("GET /api/employees/[employeeId] error", err);
    return NextResponse.json(
      { error: "Failed to load employee details" },
      { status: 500 }
    );
  }
}
