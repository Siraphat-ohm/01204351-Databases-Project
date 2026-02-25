import { NextRequest } from 'next/server';
import { ZodError } from 'zod';
import { ticketService } from '@/services/ticket.services';
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

function canReadAll(role: string) {
  return ['ADMIN', 'GROUND_STAFF', 'CABIN_CREW', 'PILOT'].includes(role);
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) return unauthorizedResponse();

    const limited = enforceApiRateLimit({
      headers: req.headers,
      namespace: 'api:v1:tickets',
      userId: session.user.id,
      action: 'read',
    });
    if (!limited.ok) return tooManyRequestsResponse(limited.retryAfterMs);

    const bookingId = req.nextUrl.searchParams.get('bookingId');
    const flightId = req.nextUrl.searchParams.get('flightId');
    const flightCode = req.nextUrl.searchParams.get('flightCode');
    const mine = req.nextUrl.searchParams.get('mine') === 'true';
    const page = Number(req.nextUrl.searchParams.get('page') ?? 1);
    const limit = Number(req.nextUrl.searchParams.get('limit') ?? 20);

    const serviceSession = { user: { id: session.user.id, role: session.user.role } };

    if (bookingId) {
      const rows = await ticketService.findByBookingId(bookingId, serviceSession);
      return successResponse(rows);
    }

    if (flightId) {
      const rows = await ticketService.findByFlightId(flightId, serviceSession);
      return successResponse(rows);
    }

    if (flightCode) {
      const rows = await ticketService.findByFlightCode(flightCode, serviceSession);
      return successResponse(rows);
    }

    if (mine || !canReadAll(session.user.role)) {
      const rows = await ticketService.findMine(serviceSession);
      return successResponse(rows);
    }

    const result = await ticketService.findAllPaginated(serviceSession, { page, limit });
    return successResponse(result);
  } catch (err) {
    if (err instanceof Error && err.name === 'UnauthorizedError') {
      return unauthorizedResponse();
    }
    console.error('[GET /api/v1/tickets]', err);
    return errorResponse('Internal server error');
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) return unauthorizedResponse();

    const limited = enforceApiRateLimit({
      headers: req.headers,
      namespace: 'api:v1:tickets',
      userId: session.user.id,
      action: 'write',
    });
    if (!limited.ok) return tooManyRequestsResponse(limited.retryAfterMs);

    const body = await req.json();
    const created = await ticketService.createTicket(body, {
      user: { id: session.user.id, role: session.user.role },
    });

    return successResponse(created, 201);
  } catch (err) {
    if (err instanceof ZodError) {
      return validationErrorResponse(zodFieldErrors(err));
    }
    if (err instanceof Error && err.name === 'UnauthorizedError') {
      return unauthorizedResponse();
    }
    if (err instanceof Error && err.name === 'TicketConflictError') {
      return errorResponse(err.message, 409);
    }
    console.error('[POST /api/v1/tickets]', err);
    return errorResponse('Internal server error');
  }
}
