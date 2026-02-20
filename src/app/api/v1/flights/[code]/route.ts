import { NextRequest } from "next/server";
import { getFlightDetail } from "@/lib/services/flight/flight.service";
import {
  successResponse,
  errorResponse,
  notFoundResponse,
  validationErrorResponse,
} from "@/lib/utils/api-response";
import { ZodError } from "zod";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  try {
    const { code } = await params;

    const flight = await getFlightDetail({ flightCode: code });

    if (!flight) {
      return notFoundResponse("Flight");
    }

    return successResponse(flight);
  } catch (err) {
    if (err instanceof ZodError) {
      return validationErrorResponse(err.flatten().fieldErrors);
    }
    console.error("[GET /api/v1/flights/[code]]", err);
    return errorResponse("Internal server error");
  }
}
