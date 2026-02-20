import { NextRequest } from "next/server";
import { getFlightSeatLayout } from "@/lib/services/flight/flight.service";
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

    const seatLayout = await getFlightSeatLayout(code);

    if (!seatLayout) {
      return notFoundResponse("Flight or seat layout");
    }

    return successResponse(seatLayout);
  } catch (err) {
    if (err instanceof ZodError) {
      return validationErrorResponse(err.flatten().fieldErrors);
    }
    console.error("[GET /api/v1/flights/[code]/seats]", err);
    return errorResponse("Internal server error");
  }
}
