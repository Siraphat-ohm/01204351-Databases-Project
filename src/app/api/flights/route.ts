import { NextRequest, NextResponse } from "next/server";
import { FlightService } from "@/lib/services/flight.service";
import { FlightStatus } from "@/generated/prisma/client";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;

    const filters = {
      page: searchParams.get("page") || 1,
      limit: searchParams.get("limit") || 20,
      origin: searchParams.get("origin")?.toUpperCase() || undefined,
      destination: searchParams.get("destination")?.toUpperCase() || undefined,
      date: searchParams.get("date") || undefined,
      status: (searchParams.get("status") as FlightStatus) || undefined,
    };

    const result = await FlightService.getFlights(filters);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Flight API Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
