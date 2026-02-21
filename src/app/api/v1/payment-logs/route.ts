import { NextRequest } from 'next/server';
import { ZodError } from 'zod';
import { paymentLogService } from '@/services/payment-log.services';
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

    const bookingId = req.nextUrl.searchParams.get('bookingId');
    const serviceSession = { user: { id: session.user.id, role: session.user.role } };

    if (bookingId) {
      const rows = await paymentLogService.findByBookingId(bookingId, serviceSession);
      return successResponse(rows);
    }

    const rows = await paymentLogService.findAll(serviceSession);
    return successResponse(rows);
  } catch (err) {
    if (err instanceof Error && err.name === 'UnauthorizedError') {
      return unauthorized();
    }
    if (err instanceof Error && err.name === 'BookingNotFoundError') {
      return errorResponse(err.message, 404);
    }
    console.error('[GET /api/v1/payment-logs]', err);
    return errorResponse('Internal server error');
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) return unauthorized();

    const body = await req.json();
    const created = await paymentLogService.create(body, {
      user: { id: session.user.id, role: session.user.role },
    });

    return successResponse(created, 201);
  } catch (err) {
    if (err instanceof ZodError) {
      return validationErrorResponse(zodFieldErrors(err));
    }
    if (err instanceof Error && err.name === 'UnauthorizedError') {
      return unauthorized();
    }
    if (err instanceof Error && err.name === 'BookingNotFoundError') {
      return errorResponse(err.message, 404);
    }
    console.error('[POST /api/v1/payment-logs]', err);
    return errorResponse('Internal server error');
  }
}
