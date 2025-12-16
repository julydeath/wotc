import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";

const ZONE_API_BASE_URL =
  "https://api-lrp-dashboard-test-eus.azurewebsites.net/api/v1/taxCredits/GetEmpowermentZone";

type ZoneApiResponse = {
  censusTract?: string | null;
  zone?: string | null;
};

type Row = Record<string, unknown>;

function getField(
  row: Row,
  candidates: string[]
): string {
  const lowerCandidates = candidates.map((c) => c.toLowerCase());

  for (const key of Object.keys(row)) {
    const lowerKey = key.toLowerCase();
    if (lowerCandidates.includes(lowerKey)) {
      const value = row[key];
      if (value === undefined || value === null) return "";
      return String(value).trim();
    }
  }

  return "";
}

async function lookupZoneForRow(
  row: Row
): Promise<{ censusTract: string; zone: string; hasAddress: boolean }> {
  const street = getField(row, ["Street", "Address", "Address1", "Address 1"]);
  const city = getField(row, ["City"]);
  const state = getField(row, ["State", "ST"]);
  const zip = getField(row, [
    "Zip",
    "ZIP",
    "ZipCode",
    "Zip Code",
    "PostalCode",
    "Postal Code",
  ]);

  if (!street || !city || !state || !zip) {
    return {
      censusTract: "",
      zone: "",
      hasAddress: false,
    };
  }

  const params = new URLSearchParams({
    Street: street,
    City: city,
    Zip: zip,
    State: state,
  });

  try {
    const res = await fetch(`${ZONE_API_BASE_URL}?${params.toString()}`, {
      method: "GET",
      headers: {
        accept: "*/*",
      },
    });

    if (!res.ok) {
      return {
        censusTract: "",
        zone: "",
        hasAddress: true,
      };
    }

    const data = (await res.json()) as ZoneApiResponse;

    return {
      censusTract:
        typeof data.censusTract === "string" ? data.censusTract : "",
      zone: typeof data.zone === "string" ? data.zone : "",
      hasAddress: true,
    };
  } catch {
    return {
      censusTract: "",
      zone: "",
      hasAddress: true,
    };
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "Excel file is required (field name: 'file')." },
        { status: 400 }
      );
    }

    const buffer = await file.arrayBuffer();

    const workbook = XLSX.read(buffer, { type: "array" });
    const sheetName = workbook.SheetNames[0];

    if (!sheetName) {
      return NextResponse.json(
        { error: "Uploaded workbook has no sheets." },
        { status: 400 }
      );
    }

    const sheet = workbook.Sheets[sheetName];

    const rows = XLSX.utils.sheet_to_json<Row>(sheet, {
      defval: "",
      raw: false,
    });

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "Uploaded sheet is empty." },
        { status: 400 }
      );
    }

    const enriched: Row[] = [];
    let rowsWithAddress = 0;

    // Process sequentially to keep things simple and predictable.
    // If you later need more speed, this can be batched.
    /* eslint-disable no-restricted-syntax */
    for (const row of rows) {
      const result = await lookupZoneForRow(row);
      if (result.hasAddress) {
        rowsWithAddress += 1;
      }

      enriched.push({
        ...row,
        censusTract: result.censusTract,
        zone: result.zone,
      });
    }
    /* eslint-enable no-restricted-syntax */

    const outWorkbook = XLSX.utils.book_new();
    const outSheet = XLSX.utils.json_to_sheet(enriched);
    XLSX.utils.book_append_sheet(outWorkbook, outSheet, "Employees");

    const outArrayBuffer = XLSX.write(outWorkbook, {
      type: "array",
      bookType: "xlsx",
    });

    const res = new NextResponse(outArrayBuffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition":
          'attachment; filename="employee-zones.xlsx"',
        "X-Rows-Total": String(rows.length),
        "X-Rows-With-Address": String(rowsWithAddress),
      },
    });

    return res;
  } catch (err) {
    console.error("POST /api/employee-zone error", err);
    return NextResponse.json(
      { error: "Failed to process employee zone Excel." },
      { status: 500 }
    );
  }
}
