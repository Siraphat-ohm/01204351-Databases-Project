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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const requiredFields = [
      "flightCode",
      "routeId",
      "aircraftId",
      "departureTime",
      "arrivalTime",
      "basePrice",
    ];

    const missingFields = requiredFields.filter((field) => !body[field]);

    if (missingFields.length > 0) {
      return NextResponse.json(
        {
          error: "Missing required fields",
          missingFields,
        },
        { status: 400 },
      );
    }

    if (typeof body.flightCode !== "string" || body.flightCode.trim() === "") {
      return NextResponse.json(
        { error: "flightCode must be a non-empty string" },
        { status: 400 },
      );
    }

    if (!Number.isInteger(body.routeId) || body.routeId <= 0) {
      return NextResponse.json(
        { error: "routeId must be a positive integer" },
        { status: 400 },
      );
    }

    if (!Number.isInteger(body.aircraftId) || body.aircraftId <= 0) {
      return NextResponse.json(
        { error: "aircraftId must be a positive integer" },
        { status: 400 },
      );
    }

    if (
      body.captainId !== undefined &&
      (!Number.isInteger(body.captainId) || body.captainId <= 0)
    ) {
      return NextResponse.json(
        { error: "captainId must be a positive integer if provided" },
        { status: 400 },
      );
    }

    const departureTime = new Date(body.departureTime);
    const arrivalTime = new Date(body.arrivalTime);

    if (isNaN(departureTime.getTime())) {
      return NextResponse.json(
        { error: "departureTime must be a valid date" },
        { status: 400 },
      );
    }

    if (isNaN(arrivalTime.getTime())) {
      return NextResponse.json(
        { error: "arrivalTime must be a valid date" },
        { status: 400 },
      );
    }

    const basePrice = parseFloat(body.basePrice);
    if (isNaN(basePrice) || basePrice <= 0) {
      return NextResponse.json(
        { error: "basePrice must be a positive number" },
        { status: 400 },
      );
    }

    if (body.status && !Object.values(FlightStatus).includes(body.status)) {
      return NextResponse.json(
        {
          error: `status must be one of: ${Object.values(FlightStatus).join(", ")}`,
        },
        { status: 400 },
      );
    }

    const flightInput: CreateFlightInput = {
      flightCode: body.flightCode.toUpperCase(),
      routeId: body.routeId,
      aircraftId: body.aircraftId,
      captainId: body.captainId,
      gate: body.gate,
      departureTime,
      arrivalTime,
      basePrice,
      status: body.status,
    };

    const flight = await FlightService.createFlight(flightInput);

    return NextResponse.json(
      {
        success: true,
        message: "Flight created successfully",
        data: flight,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Create Flight API Error:", error);

    if (error instanceof Error) {
      if (
        error.message.includes("already exists") ||
        error.message.includes("not found") ||
        error.message.includes("not active") ||
        error.message.includes("not a pilot") ||
        error.message.includes("must be before")
      ) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }

    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
