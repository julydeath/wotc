import { NextRequest, NextResponse } from "next/server";
import { query } from "@/app/lib/mysql";
import type { CompanyContact } from "@/app/lib/types";

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
      SELECT
        contactname,
        contactphone,
        contactemail
      FROM companycontactoverview
      WHERE customerid = ?
        AND maincontact = 1
      LIMIT 1
    `;

    const rows = await query<CompanyContact>(sql, [customerId]);
    const contact = rows[0] ?? null;

    return NextResponse.json(contact);
  } catch (err) {
    console.error("GET /api/companies/[customerId]/contact error", err);
    return NextResponse.json(
      { error: "Failed to load contact" },
      { status: 500 }
    );
  }
}
