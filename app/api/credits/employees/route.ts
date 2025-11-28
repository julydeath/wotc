// app/api/credits/employees/route.ts
import { NextRequest, NextResponse } from "next/server";
import { query } from "@/app/lib/mysql";
import type { CreditEmployee } from "@/app/lib/types";

type MetricParam =
  | "screened"
  | "qualified"
  | "nonQualified"
  | "certs"
  | "denials"
  | "pending";

const VALID_METRICS: MetricParam[] = [
  "screened",
  "qualified",
  "nonQualified",
  "certs",
  "denials",
  "pending",
];

type RawRow = {
  id: number;
  FirstName: string | null;
  LastName: string | null;
  SSN: string | null;
  datehired: string;
  LocationID: number;
  LocationName: string | null;
  City: string | null;
  State: string | null;
  CertifiedDate: string;
  DeniedDate: string;
  PendingDate: string;
  sent: number;
  DPC: number;
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const metric = searchParams.get("metric") as MetricParam | null;
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const customerIdParam = searchParams.get("customerId");
    const locationIdParam = searchParams.get("locationId");
    const limitParam = searchParams.get("limit");

    if (!metric || !VALID_METRICS.includes(metric)) {
      return NextResponse.json(
        {
          error:
            "Invalid 'metric'. Use one of: screened, qualified, nonQualified, certs, denials, pending.",
        },
        { status: 400 }
      );
    }

    if (!from || !to) {
      return NextResponse.json(
        {
          error:
            "Missing 'from' or 'to'. Pass both (e.g. ?from=2025-01-01&to=2025-12-31).",
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

    // sanitize limit and inline it (no placeholder)
    let limit = 200;
    if (limitParam && !Number.isNaN(Number(limitParam))) {
      limit = Math.min(Math.max(Number(limitParam), 1), 1000);
    }

    // Base query (your original join + hire date filter)
    let sql = `
      SELECT
        e.id,
        e.FirstName,
        e.LastName,
        e.SSN,
        e.datehired,
        e.LocationID,
        l.Name AS LocationName,
        l.City,
        l.State,
        ec.CertifiedDate,
        ec.DeniedDate,
        ec.PendingDate,
        ec.sent,
        ec.DPC
      FROM wotcempcredits ec
      JOIN wotcemployee e
        ON e.id = ec.EmpID
      LEFT JOIN locations l
        ON e.LocationID = l.id
      WHERE e.datehired BETWEEN ? AND ?
    `;

    const params: any[] = [from, to];

    // Metric-specific conditions – match your SQL
    switch (metric) {
      case "screened":
        // all rows in period: no extra condition
        break;

      case "qualified":
        sql += " AND ec.sent = 1";
        break;

      case "nonQualified":
        sql += " AND ec.sent = 0";
        break;

      case "certs":
        sql += " AND ec.sent = 1 AND ec.CertifiedDate BETWEEN ? AND ?";
        params.push(from, to);
        break;

      case "denials":
        sql += " AND ec.sent = 1 AND ec.DeniedDate BETWEEN ? AND ?";
        params.push(from, to);
        break;

      case "pending":
        sql +=
          " AND ec.sent = 1 AND ec.DPC = 2 AND ec.PendingDate BETWEEN ? AND ?";
        params.push(from, to);
        break;
    }

    if (customerId) {
      sql += " AND l.customerid = ?";
      params.push(customerId);
    }

    if (locationId) {
      sql += " AND e.LocationID = ?";
      params.push(locationId);
    }

    // IMPORTANT: no placeholder here – we inline the (sanitized) integer
    sql += ` ORDER BY e.datehired DESC LIMIT ${limit}`;

    const rows = await query<RawRow>(sql, params);

    const mapped: CreditEmployee[] = rows.map((r) => ({
      id: r.id,
      FirstName: r.FirstName,
      LastName: r.LastName,
      SSN: r.SSN,
      datehired: r.datehired,
      LocationID: r.LocationID,
      LocationName: r.LocationName,
      City: r.City,
      State: r.State,
      CertifiedDate: r.CertifiedDate,
      DeniedDate: r.DeniedDate,
      PendingDate: r.PendingDate,
      sent: r.sent,
      DPC: r.DPC,
    }));

    return NextResponse.json(mapped);
  } catch (err) {
    console.error("GET /api/credits/employees error", err);
    return NextResponse.json(
      { error: "Failed to load employees for metric" },
      { status: 500 }
    );
  }
}
