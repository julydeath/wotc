import { NextRequest, NextResponse } from "next/server";
import { query } from "@/app/lib/mysql";
import type { CompanyRecord } from "@/app/lib/types";

type Params = Promise<{ customerId: string }>;

export async function GET(_req: NextRequest, { params }: { params: Params }) {
  try {
    const customerId = Number((await params).customerId);
    if (!customerId || Number.isNaN(customerId)) {
      return NextResponse.json(
        { error: "Invalid customerId" },
        { status: 400 }
      );
    }

    const sql = `
      SELECT *
      FROM customers
      WHERE CustomerID = ?
      LIMIT 1
    `;

    const rows = await query<CompanyRecord>(sql, [customerId]);
    const company = rows[0] ?? null;

    return NextResponse.json(company);
  } catch (err) {
    console.error("GET /api/companies/[customerId] error", err);
    return NextResponse.json(
      { error: "Failed to load company details" },
      { status: 500 }
    );
  }
}
