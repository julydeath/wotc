import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { query } from "@/app/lib/mysql";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const q = searchParams.get("q")?.trim() ?? "";
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

    let sql = `
      SELECT DISTINCT l.*
      FROM locations l
      JOIN wotcemployee e
        ON e.LocationID = l.id
      JOIN customers c
        ON c.CustomerID = l.customerid
      WHERE l.inactive = 0
        AND e.datehired BETWEEN ? AND ?
    `;

    const params: unknown[] = [from, to];

    if (customerId) {
      sql += " AND c.CustomerID = ?";
      params.push(customerId);
    }

    if (locationId) {
      sql += " AND l.id = ?";
      params.push(locationId);
    }

    if (q) {
      sql += `
        AND (
          l.Name LIKE ?
          OR l.City LIKE ?
          OR l.State LIKE ?
          OR l.Zip LIKE ?
        )
      `;
      params.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
    }

    sql += " ORDER BY l.Name";

    const rows = await query<Record<string, unknown>>(sql, params);

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Locations");

    const arrayBuffer = XLSX.write(workbook, {
      type: "array",
      bookType: "xlsx",
    });

    const nameParts = ["locations", from, to];
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
    console.error("GET /api/credits/locations/export error", err);
    return NextResponse.json(
      { error: "Failed to generate locations Excel" },
      { status: 500 }
    );
  }
}

