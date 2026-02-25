import { NextRequest } from 'next/server';
import { ZodError } from 'zod';
import { flightOpsLogService } from '@/services/flight-ops-log.services';
import { getServerSession } from '@/services/auth.services';
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  tooManyRequestsResponse,
  validationErrorResponse,
  zodFieldErrors,
} from '@/lib/utils/api-response';
import { enforceApiRateLimit } from '@/lib/utils/rate-limit';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) return unauthorizedResponse();

    const limited = enforceApiRateLimit({
      headers: req.headers,
      namespace: 'api:v1:flight-ops-logs',
      userId: session.user.id,
      action: 'read',
    });
    if (!limited.ok) return tooManyRequestsResponse(limited.retryAfterMs);

    const flightId = req.nextUrl.searchParams.get('flightId');
    const page = Number(req.nextUrl.searchParams.get('page') ?? 1);
    const limit = Number(req.nextUrl.searchParams.get('limit') ?? 20);
    const s = { user: { id: session.user.id, role: session.user.role } };

    if (flightId) {
      const row = await flightOpsLogService.findByFlightId(flightId, s);
      return successResponse(row);
    }

    const result = await flightOpsLogService.findAllPaginated(s, { page, limit });
    return successResponse(result);
  } catch (err) {
    if (err instanceof Error && err.name === 'UnauthorizedError') {
      return unauthorizedResponse();
    }
    if (
      err instanceof Error &&
      (err.name === 'FlightOpsLogNotFoundError' || err.name === 'FlightNotFoundError')
    ) {
      return errorResponse(err.message, 404);
    }
    console.error('[GET /api/v1/flight-ops-logs]', err);
    return errorResponse('Internal server error');
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) return unauthorizedResponse();

    const limited = enforceApiRateLimit({
      headers: req.headers,
      namespace: 'api:v1:flight-ops-logs',
      userId: session.user.id,
      action: 'write',
    });
    if (!limited.ok) return tooManyRequestsResponse(limited.retryAfterMs);

    const flightId = req.nextUrl.searchParams.get('flightId');
    if (!flightId) return errorResponse('flightId query is required', 400);

    const body = await req.json();
    const row = await flightOpsLogService.upsertByFlightId(flightId, body, {
      user: { id: session.user.id, role: session.user.role },
    });

    return successResponse(row);
  } catch (err) {
    if (err instanceof ZodError) {
      return validationErrorResponse(zodFieldErrors(err));
    }
    if (err instanceof Error && err.name === 'UnauthorizedError') {
      return unauthorizedResponse();
    }
    if (err instanceof Error && err.name === 'FlightNotFoundError') {
      return errorResponse(err.message, 404);
    }
    console.error('[PUT /api/v1/flight-ops-logs]', err);
    return errorResponse('Internal server error');
  }
}
