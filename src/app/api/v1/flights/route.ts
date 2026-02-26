import { NextRequest } from "next/server";
import { flightService } from "@/services/flight.services";
import {
  successResponse,
  errorResponse,
  validationErrorResponse,
  zodFieldErrors,
} from "@/lib/utils/api-response";
import { ZodError } from "zod";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;

    const params = {
      originIataCode: searchParams.get("originIataCode") ?? undefined,
      destinationIataCode: searchParams.get("destinationIataCode") ?? undefined,
      departureDate: searchParams.get("departureDate") ?? undefined,
      page: Number(searchParams.get("page") ?? 1),
      limit: Number(searchParams.get("limit") ?? 10),
    };

    const result = await flightService.searchWithAvailability(params, {
      user: {
        id: "public",
        role: "PASSENGER",
      },
    });

      return successResponse(result["data"]);
  } catch (err) {
    if (err instanceof ZodError) {
      return validationErrorResponse(zodFieldErrors(err)); 
    }
    console.error("[GET /api/v1/flights]", err);
    return errorResponse("Internal server error");
  }
}
