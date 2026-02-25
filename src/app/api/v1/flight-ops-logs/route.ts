import { NextRequest } from 'next/server';
import { ZodError } from 'zod';
import { flightOpsLogService } from '@/services/flight-ops-log.services';
import { getServerSession } from '@/services/auth.services';
import {
  successResponse,
  errorResponse,
  validationErrorResponse,
  zodFieldErrors,
} from '@/lib/utils/api-response';

function unauthorized() {
  return errorResponse('Unauthorized', 401);
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) return unauthorized();

    const flightId = req.nextUrl.searchParams.get('flightId');
    const s = { user: { id: session.user.id, role: session.user.role } };

    if (flightId) {
      const row = await flightOpsLogService.findByFlightId(flightId, s);
      return successResponse(row);
    }

    const rows = await flightOpsLogService.findAll(s);
    return successResponse(rows);
  } catch (err) {
    if (err instanceof Error && err.name === 'UnauthorizedError') {
      return unauthorized();
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
    if (!session?.user) return unauthorized();

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
      return unauthorized();
    }
    if (err instanceof Error && err.name === 'FlightNotFoundError') {
      return errorResponse(err.message, 404);
    }
    console.error('[PUT /api/v1/flight-ops-logs]', err);
    return errorResponse('Internal server error');
  }
}
