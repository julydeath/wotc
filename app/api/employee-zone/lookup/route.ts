import { NextRequest, NextResponse } from "next/server";

const ZONE_API_BASE_URL =
  "https://api-lrp-dashboard-test-eus.azurewebsites.net/api/v1/taxCredits/GetEmpowermentZone";

type LookupBody = {
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
};

type ZoneApiResponse = {
  censusTract?: string | null;
  zone?: string | null;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as LookupBody;

    const street = (body.street ?? "").trim();
    const city = (body.city ?? "").trim();
    const state = (body.state ?? "").trim();
    const zip = (body.zip ?? "").trim();

    if (!street || !city || !state || !zip) {
      return NextResponse.json(
        {
          censusTract: "",
          zone: "",
          missingAddress: true,
        },
        { status: 200 }
      );
    }

    const params = new URLSearchParams({
      Street: street,
      City: city,
      Zip: zip,
      State: state,
    });

    const res = await fetch(`${ZONE_API_BASE_URL}?${params.toString()}`, {
      method: "GET",
      headers: {
        accept: "*/*",
      },
    });

    if (!res.ok) {
      return NextResponse.json(
        {
          censusTract: "",
          zone: "",
          missingAddress: false,
        },
        { status: 200 }
      );
    }

    const data = (await res.json()) as ZoneApiResponse;

    return NextResponse.json(
      {
        censusTract:
          typeof data.censusTract === "string" ? data.censusTract : "",
        zone: typeof data.zone === "string" ? data.zone : "",
        missingAddress: false,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("POST /api/employee-zone/lookup error", err);
    return NextResponse.json(
      {
        censusTract: "",
        zone: "",
        missingAddress: false,
      },
      { status: 200 }
    );
  }
}

