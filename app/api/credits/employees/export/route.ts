import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { query } from "@/app/lib/mysql";

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

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const metric = (searchParams.get("metric") as MetricParam | null) ?? "screened";
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const customerIdParam = searchParams.get("customerId");
    const locationIdParam = searchParams.get("locationId");

    if (!VALID_METRICS.includes(metric)) {
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

    let sql = `
      SELECT DISTINCT e.*
      FROM wotcempcredits ec
      JOIN wotcemployee e
        ON e.id = ec.EmpID
      LEFT JOIN locations l
        ON e.LocationID = l.id
      WHERE e.datehired BETWEEN ? AND ?
    `;

    const params: unknown[] = [from, to];

    switch (metric) {
      case "screened":
        // no extra condition
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

    sql += " ORDER BY e.datehired DESC";

    const rows = await query<Record<string, unknown>>(sql, params);

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Employees");

    const arrayBuffer = XLSX.write(workbook, {
      type: "array",
      bookType: "xlsx",
    });

    const nameParts = ["employees", metric, from, to];
    if (customerId) nameParts.push(`customer_${customerId}`);
    if (locationId) nameParts.push(`location_${locationId}`);
    const fileName = `${nameParts.filter(Boolean).join("_")}.xlsx`;

    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (err) {
    console.error("GET /api/credits/employees/export error", err);
    return NextResponse.json(
      { error: "Failed to generate employees Excel" },
      { status: 500 }
    );
  }
}

