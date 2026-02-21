import { NextRequest } from "next/server";
import { flightService } from "@/services/flight.services";
import {
  successResponse,
  errorResponse,
  notFoundResponse,
  validationErrorResponse,
  zodFieldErrors,
} from "@/lib/utils/api-response";
import { ZodError } from "zod";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  try {
    const { code } = await params;

    const flight = await flightService.findPublicDetailWithAvailability({
      flightCode: code,
    });

    if (!flight) {
      return notFoundResponse("Flight");
    }

    return successResponse(flight);
  } catch (err) {
    if (err instanceof ZodError) {
      return validationErrorResponse(zodFieldErrors(err));
    }
    console.error("[GET /api/v1/flights/[code]]", err);
    return errorResponse("Internal server error");
  }
}
