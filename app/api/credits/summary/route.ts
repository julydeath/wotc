// app/api/credits/summary/route.ts
import { NextRequest, NextResponse } from "next/server";
import { query } from "@/app/lib/mysql";
import type { CreditsSummary } from "@/app/lib/types";

type RawRow = {
  screened: number | null;
  qualified: number | null;
  nonQualified: number | null;
  totalCerts: number | null;
  totalDenials: number | null;
  totalPending: number | null;
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const customerIdParam = searchParams.get("customerId");
    const locationIdParam = searchParams.get("locationId");

    // You can relax this if you want, but usually we *need* a date range.
    if (!from || !to) {
      return NextResponse.json(
        {
          error:
            "Missing 'from' or 'to'. Pass both as query params (e.g. ?from=2025-01-01&to=2025-12-31).",
        },
        { status: 400 }
      );
    }

    const customerId = customerIdParam ? Number(customerIdParam) : null;
    const locationId = locationIdParam ? Number(locationIdParam) : null;

    if (customerIdParam && (Number.isNaN(customerId!) || customerId! <= 0)) {
      return NextResponse.json(
        { error: "customerId must be a positive number" },
        { status: 400 }
      );
    }

    if (locationIdParam && (Number.isNaN(locationId!) || locationId! <= 0)) {
      return NextResponse.json(
        { error: "locationId must be a positive number" },
        { status: 400 }
      );
    }

    // Build SQL with CASE-based aggregates
    let sql = `
      SELECT
        COUNT(*) AS screened,
        SUM(CASE WHEN ec.sent = 1 THEN 1 ELSE 0 END) AS qualified,
        SUM(CASE WHEN ec.sent = 0 THEN 1 ELSE 0 END) AS nonQualified,
        SUM(
          CASE
            WHEN ec.sent = 1
             AND ec.CertifiedDate BETWEEN ? AND ?
          THEN 1 ELSE 0 END
        ) AS totalCerts,
        SUM(
          CASE
            WHEN ec.sent = 1
             AND ec.DeniedDate BETWEEN ? AND ?
          THEN 1 ELSE 0 END
        ) AS totalDenials,
        SUM(
          CASE
            WHEN ec.sent = 1
             AND ec.DPC = 2
             AND ec.PendingDate BETWEEN ? AND ?
          THEN 1 ELSE 0 END
        ) AS totalPending
      FROM wotcempcredits ec
      JOIN wotcemployee e
        ON e.id = ec.EmpID
      LEFT JOIN locations l
        ON e.LocationID = l.id
      WHERE e.datehired BETWEEN ? AND ?
    `;

    // Order of params must strictly match the ? placeholders above
    const params: any[] = [
      // For CertifiedDate BETWEEN ? AND ?
      from,
      to,
      // For DeniedDate BETWEEN ? AND ?
      from,
      to,
      // For PendingDate BETWEEN ? AND ?
      from,
      to,
      // For e.datehired BETWEEN ? AND ?
      from,
      to,
    ];

    if (customerId) {
      sql += " AND l.customerid = ?";
      params.push(customerId);
    }

    if (locationId) {
      sql += " AND e.LocationID = ?";
      params.push(locationId);
    }

    const rows = await query<RawRow>(sql, params);
    const row = rows[0] || {
      screened: 0,
      qualified: 0,
      nonQualified: 0,
      totalCerts: 0,
      totalDenials: 0,
      totalPending: 0,
    };

    const result: CreditsSummary = {
      screened: row.screened ?? 0,
      qualified: row.qualified ?? 0,
      nonQualified: row.nonQualified ?? 0,
      totalCerts: row.totalCerts ?? 0,
      totalDenials: row.totalDenials ?? 0,
      totalPending: row.totalPending ?? 0,
    };

    return NextResponse.json(result);
  } catch (err) {
    console.error("GET /api/credits/summary error", err);
    return NextResponse.json(
      { error: "Failed to compute credits summary" },
      { status: 500 }
    );
  }
}
