import { NextRequest, NextResponse } from "next/server";
import { FlightService } from "@/lib/services/frontoffice/flight";
import type { FlightSearchParams } from "@/types/flight";

const parseNumber = (value: string | null) => {
  if (!value) {
    return undefined;
  }

  const num = Number(value);
  return Number.isFinite(num) ? num : undefined;
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;

    const filters: FlightSearchParams = {
      page: parseNumber(searchParams.get("page")),
      limit: parseNumber(searchParams.get("limit")),
      origin: searchParams.get("origin")?.toUpperCase(),
      destination: searchParams.get("destination")?.toUpperCase(),
      date: searchParams.get("date") || undefined,
    };

    const result = await FlightService.getAvailableFlights(filters);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Frontoffice flights error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
