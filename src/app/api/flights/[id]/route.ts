import { FlightService } from "@/lib/services/flight.service";
import { NextRequest, NextResponse } from "next/server";
import { FlightStatus } from "@/generated/prisma/client";
import { UpdateFlightInput } from "@/types/flight";

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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: idParam } = await params;
    const id = parseInt(idParam);

    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid flight ID" }, { status: 400 });
    }

    const body = await req.json();

    // Validate data types for each field if provided
    if (body.flightCode !== undefined) {
      if (
        typeof body.flightCode !== "string" ||
        body.flightCode.trim() === ""
      ) {
        return NextResponse.json(
          { error: "flightCode must be a non-empty string" },
          { status: 400 },
        );
      }
    }

    if (body.routeId !== undefined) {
      if (!Number.isInteger(body.routeId) || body.routeId <= 0) {
        return NextResponse.json(
          { error: "routeId must be a positive integer" },
          { status: 400 },
        );
      }
    }

    if (body.aircraftId !== undefined) {
      if (!Number.isInteger(body.aircraftId) || body.aircraftId <= 0) {
        return NextResponse.json(
          { error: "aircraftId must be a positive integer" },
          { status: 400 },
        );
      }
    }

    if (body.captainId !== undefined && body.captainId !== null) {
      if (!Number.isInteger(body.captainId) || body.captainId <= 0) {
        return NextResponse.json(
          { error: "captainId must be a positive integer or null" },
          { status: 400 },
        );
      }
    }

    if (body.gate !== undefined && body.gate !== null) {
      if (typeof body.gate !== "string") {
        return NextResponse.json(
          { error: "gate must be a string or null" },
          { status: 400 },
        );
      }
    }

    // Validate dates if provided
    if (body.departureTime !== undefined) {
      const departureTime = new Date(body.departureTime);
      if (isNaN(departureTime.getTime())) {
        return NextResponse.json(
          { error: "departureTime must be a valid date" },
          { status: 400 },
        );
      }
    }

    if (body.arrivalTime !== undefined) {
      const arrivalTime = new Date(body.arrivalTime);
      if (isNaN(arrivalTime.getTime())) {
        return NextResponse.json(
          { error: "arrivalTime must be a valid date" },
          { status: 400 },
        );
      }
    }

    // Validate basePrice if provided
    if (body.basePrice !== undefined) {
      const basePrice = parseFloat(body.basePrice);
      if (isNaN(basePrice) || basePrice <= 0) {
        return NextResponse.json(
          { error: "basePrice must be a positive number" },
          { status: 400 },
        );
      }
    }

    // Validate status if provided
    if (body.status !== undefined) {
      if (!Object.values(FlightStatus).includes(body.status)) {
        return NextResponse.json(
          {
            error: `status must be one of: ${Object.values(FlightStatus).join(", ")}`,
          },
          { status: 400 },
        );
      }
    }

    // Create update input
    const updateInput: UpdateFlightInput = {};

    if (body.flightCode !== undefined)
      updateInput.flightCode = body.flightCode.toUpperCase();
    if (body.routeId !== undefined) updateInput.routeId = body.routeId;
    if (body.aircraftId !== undefined) updateInput.aircraftId = body.aircraftId;
    if (body.captainId !== undefined) updateInput.captainId = body.captainId;
    if (body.gate !== undefined) updateInput.gate = body.gate;
    if (body.departureTime !== undefined)
      updateInput.departureTime = new Date(body.departureTime);
    if (body.arrivalTime !== undefined)
      updateInput.arrivalTime = new Date(body.arrivalTime);
    if (body.basePrice !== undefined) updateInput.basePrice = body.basePrice;
    if (body.status !== undefined) updateInput.status = body.status;

    // Update flight
    const updatedFlight = await FlightService.updateFlight(id, updateInput);

    return NextResponse.json(
      {
        success: true,
        message: "Flight updated successfully",
        data: updatedFlight,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Update Flight API Error:", error);

    // Handle specific error messages from the service
    if (error instanceof Error) {
      if (
        error.message.includes("not found") ||
        error.message.includes("already exists") ||
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
