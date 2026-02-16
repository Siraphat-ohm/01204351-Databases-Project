import { FlightService } from "@/lib/services/flight.service";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: idParam } = await params;
    const id = parseInt(idParam);

    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid flight ID" }, { status: 400 });
    }

    const flight = await FlightService.getFlightById(id);

    if (!flight) {
      return NextResponse.json({ error: "Flight not found" }, { status: 404 });
    }

    return NextResponse.json(flight);
  } catch (error) {
    console.error("Flight API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch flight" },
      { status: 500 },
    );
  }
}
