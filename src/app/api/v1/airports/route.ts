import { NextRequest } from "next/server";
import { airportService } from "@/services/airport.services";
import { getServerSession } from "@/services/auth.services";
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  tooManyRequestsResponse,
} from "@/lib/utils/api-response";
import { enforceApiRateLimit } from "@/lib/utils/rate-limit";

function resolvePageLimit(req: NextRequest) {
  const pageParam = req.nextUrl.searchParams.get("page");
  const limitParam = req.nextUrl.searchParams.get("limit");
  const skipParam = req.nextUrl.searchParams.get("skip");
  const takeParam = req.nextUrl.searchParams.get("take");

  if (skipParam !== null || takeParam !== null) {
    const skip = Number(skipParam ?? 0);
    const take = Number(takeParam ?? 20);
    const limit = take > 0 ? take : 20;
    const page = Math.floor((skip > 0 ? skip : 0) / limit) + 1;
    return { page, limit };
  }

  return {
    page: Number(pageParam ?? 1),
    limit: Number(limitParam ?? 20),
  };
}

export async function GET(req: NextRequest) {
  try {
    const search = req.nextUrl.searchParams.get("search") ?? "";
    const { page, limit } = resolvePageLimit(req);

    const clientIp =
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";

    const limited = enforceApiRateLimit({
      headers: req.headers,
      namespace: "api:v1:airports",
      userId: clientIp,
      action: "read",
    });
    if (!limited.ok) return tooManyRequestsResponse(limited.retryAfterMs);

    const session = await getServerSession();
    const publicSession = {
      user: {
        id: session?.user?.id ?? "public",
        role: session?.user?.role ?? "PASSENGER",
      },
    };

    const result = await airportService.searchPaginated(search, publicSession, {
      page,
      limit,
    });

    return successResponse(result["data"]);
  } catch (err) {
    if (err instanceof Error && err.name === "UnauthorizedError") {
      return unauthorizedResponse();
    }
    console.error("[GET /api/v1/airports]", err);
    return errorResponse("Internal server error");
  }
}
