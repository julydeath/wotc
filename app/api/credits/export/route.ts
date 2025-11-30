import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { query } from "@/app/lib/mysql";
import type { CreditsSummary } from "@/app/lib/types";
import { AVERAGE_CREDIT, REVENUE_RATE } from "@/app/lib/credits";

type RawRow = {
  screened: number | null;
  qualified: number | null;
  nonQualified: number | null;
  totalCerts: number | null;
  totalDenials: number | null;
  totalPending: number | null;
};

async function getCreditsSummary(
  from: string,
  to: string,
  customerId: number | null,
  locationId: number | null
): Promise<CreditsSummary> {
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

  const params: unknown[] = [
    from,
    to,
    from,
    to,
    from,
    to,
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

  return {
    screened: row.screened ?? 0,
    qualified: row.qualified ?? 0,
    nonQualified: row.nonQualified ?? 0,
    totalCerts: row.totalCerts ?? 0,
    totalDenials: row.totalDenials ?? 0,
    totalPending: row.totalPending ?? 0,
  };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const customerIdParam = searchParams.get("customerId");
    const locationIdParam = searchParams.get("locationId");

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

    const summary = await getCreditsSummary(
      from,
      to,
      customerId ?? null,
      locationId ?? null
    );

    const pendingCredit = summary.totalPending * 0.5 * AVERAGE_CREDIT;
    const pendingRevenue = pendingCredit * REVENUE_RATE;
    const certifiedCredit = summary.totalCerts * AVERAGE_CREDIT;
    const certifiedRevenue = certifiedCredit * REVENUE_RATE;
    const estimatedTotal = pendingRevenue + certifiedRevenue;

    const rowsForSheet: (string | number)[][] = [
      ["Metric", "Value", "Description"],
      [
        "Number screened YTD",
        summary.screened,
        "based on hire dates for year",
      ],
      ["Qualified", summary.qualified, "sum certs, denials, pending"],
      ["Non-qualified", summary.nonQualified, "screened less qualified"],
      ["Total certs", summary.totalCerts, "based on year cert received"],
      ["Total denials", summary.totalDenials, "based on year cert received"],
      ["Total pending", summary.totalPending, "based on current count"],
      [],
      [
        "Pending credit",
        pendingCredit,
        "totalPending * 0.5 * average credit",
      ],
      ["Pending revenue", pendingRevenue, "pending credit * revenue rate"],
      ["Certified credit", certifiedCredit, "totalCerts * average credit"],
      ["Certified revenue", certifiedRevenue, "certified credit * revenue rate"],
      ["Estimated total", estimatedTotal, "pending revenue + certified revenue"],
      [],
      ["Average credit", AVERAGE_CREDIT, ""],
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(rowsForSheet);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Summary");

    // Raw credits sheet – all wotcempcredits rows matching filter
    let rawSql = `
      SELECT ec.*
      FROM wotcempcredits ec
      JOIN wotcemployee e
        ON e.id = ec.EmpID
      LEFT JOIN locations l
        ON e.LocationID = l.id
      WHERE e.datehired BETWEEN ? AND ?
    `;

    const rawParams: unknown[] = [from, to];

    if (customerId) {
      rawSql += " AND l.customerid = ?";
      rawParams.push(customerId);
    }

    if (locationId) {
      rawSql += " AND e.LocationID = ?";
      rawParams.push(locationId);
    }

    rawSql += " ORDER BY e.datehired DESC";

    const rawRows = await query<Record<string, unknown>>(rawSql, rawParams);
    const rawSheet = XLSX.utils.json_to_sheet(rawRows);
    XLSX.utils.book_append_sheet(workbook, rawSheet, "CreditsRaw");

    const arrayBuffer = XLSX.write(workbook, {
      type: "array",
      bookType: "xlsx",
    });

    const fileNameParts = ["credits"];
    if (from) fileNameParts.push(from);
    if (to) fileNameParts.push(to);
    const fileName = `${fileNameParts.join("_")}.xlsx`;

    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (err) {
    console.error("GET /api/credits/export error", err);
    return NextResponse.json(
      { error: "Failed to generate credits Excel" },
      { status: 500 }
    );
  }
}
