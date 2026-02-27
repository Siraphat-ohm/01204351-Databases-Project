import { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { bookingService } from '@/services/booking.services';
import { getServerSession } from '@/services/auth.services';
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  tooManyRequestsResponse,
  validationErrorResponse,
  zodFieldErrors,
} from '@/lib/utils/api-response';
import { NotFoundError, ConflictError, UnauthorizedError, BadRequestError } from '@/lib/errors';
import { enforceApiRateLimit } from '@/lib/utils/rate-limit';

function canReadAll(role: string) {
  return ['ADMIN', 'GROUND_STAFF'].includes(role);
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) return unauthorizedResponse();

    const limited = enforceApiRateLimit({
      headers: req.headers,
      namespace: 'api:v1:bookings',
      userId: session.user.id,
      action: 'read',
    });
    if (!limited.ok) return tooManyRequestsResponse(limited.retryAfterMs);

    const bookingRef = req.nextUrl.searchParams.get('bookingRef');
    const flightId = req.nextUrl.searchParams.get('flightId');
    const flightCode = req.nextUrl.searchParams.get('flightCode');
    const mine = req.nextUrl.searchParams.get('mine') === 'true';
    const page = Number(req.nextUrl.searchParams.get('page') ?? 1);
    const limit = Number(req.nextUrl.searchParams.get('limit') ?? 20);

    const serviceSession = { user: { id: session.user.id, role: session.user.role } };

    if (bookingRef) {
      const row = await bookingService.findByBookingRef(bookingRef, serviceSession);
      return successResponse(row);
    }

    if (flightId) {
      const rows = await bookingService.findByFlightId(flightId, serviceSession);
      return successResponse(rows);
    }

    if (flightCode) {
      const rows = await bookingService.findByFlightCode(flightCode, serviceSession);
      return successResponse(rows);
    }

    if (mine || !canReadAll(session.user.role)) {
      const rows = await bookingService.findMine(serviceSession);
      return successResponse(rows);
    }

    const result = await bookingService.findAllPaginated(serviceSession, { page, limit });
    return successResponse(result);
  } catch (err) {
    if (err instanceof UnauthorizedError) return unauthorizedResponse();
    if (err instanceof NotFoundError) return errorResponse(err.message, 404);
    console.error('[GET /api/v1/bookings]', err);
    return errorResponse('Internal server error');
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    const userId = session?.user?.id ?? 'guest';

    const limited = enforceApiRateLimit({
      headers: req.headers,
      namespace: 'api:v1:bookings',
      userId,
      action: 'write',
    });
    if (!limited.ok) return tooManyRequestsResponse(limited.retryAfterMs);

    const body = await req.json();
    const hasTickets =
      Array.isArray((body as { tickets?: unknown }).tickets) &&
      (body as { tickets?: unknown[] }).tickets!.length > 0;

    const created = session?.user
      ? hasTickets
        ? await bookingService.createBookingWithTickets(body, {
            user: { id: session.user.id, role: session.user.role },
          })
        : await bookingService.createBooking(body, {
            user: { id: session.user.id, role: session.user.role },
          })
      : hasTickets
        ? await bookingService.createGuestBookingWithTickets(body)
        : await bookingService.createGuestBooking(body);

    return successResponse(created, 201);
  } catch (err) {
    if (err instanceof ZodError) return validationErrorResponse(zodFieldErrors(err));
    if (err instanceof UnauthorizedError) return unauthorizedResponse();
    if (err instanceof NotFoundError) return errorResponse(err.message, 404);
    if (err instanceof ConflictError) return NextResponse.json({ error: err.message }, { status: 409 });
    if (err instanceof BadRequestError) return errorResponse(err.message, 400);

    console.error('[POST /api/v1/bookings]', err);
    return errorResponse('Internal server error');
  }
}
