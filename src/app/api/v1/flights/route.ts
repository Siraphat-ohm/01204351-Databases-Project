import { NextRequest } from "next/server";
import { getFlightsWithAvailability } from "@/lib/services/flight/flight.service";
import {
  successResponse,
  errorResponse,
  validationErrorResponse,
} from "@/lib/utils/api-response";
import { ZodError } from "zod";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;

    const params = {
      originIataCode: searchParams.get("originIataCode") ?? undefined,
      destinationIataCode: searchParams.get("destinationIataCode") ?? undefined,
      departureDate: searchParams.get("departureDate") ?? undefined,
      page: searchParams.get("page") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
    };

    const result = await getFlightsWithAvailability(params);

    return successResponse(result);
  } catch (err) {
    if (err instanceof ZodError) {
      return validationErrorResponse(err.flatten().fieldErrors);
    }
    console.error("[GET /api/v1/flights]", err);
    return errorResponse("Internal server error");
  }
}
