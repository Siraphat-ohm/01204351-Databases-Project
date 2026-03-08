import { NextRequest } from 'next/server';
import { ZodError } from 'zod';
import { NotFoundError, ConflictError, UnauthorizedError, BadRequestError } from '@/lib/errors';
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
import { enforceApiRateLimit } from '@/lib/utils/rate-limit';

type Action = 'cancel' | 'change-flight' | 'accept-reaccommodation' | 'cancel-reaccommodation';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession();
    if (!session?.user) return unauthorizedResponse();

    const limited = enforceApiRateLimit({
      headers: req.headers,
      namespace: 'api:v1:bookings:id',
      userId: session.user.id,
      action: 'read',
    });
    if (!limited.ok) return tooManyRequestsResponse(limited.retryAfterMs);

    const { id } = await params;
    const row = await bookingService.findById(id, {
      user: { id: session.user.id, role: session.user.role },
    });

    return successResponse(row);
  } catch (err) {
    if (err instanceof NotFoundError) return errorResponse(err.message, 404);
    if (err instanceof UnauthorizedError) return unauthorizedResponse();
    console.error('[GET /api/v1/bookings/[id]]', err);
    return errorResponse('Internal server error');
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession();
    if (!session?.user) return unauthorizedResponse();

    const limited = enforceApiRateLimit({
      headers: req.headers,
      namespace: 'api:v1:bookings:id',
      userId: session.user.id,
      action: 'write',
    });
    if (!limited.ok) return tooManyRequestsResponse(limited.retryAfterMs);

    const { id } = await params;
    const body = await req.json();
    const action = (typeof body?.action === 'string' ? body.action : '').toLowerCase() as Action;

    const serviceSession = { user: { id: session.user.id, role: session.user.role } };

    if (action === 'cancel') {
      const row = await bookingService.cancelBooking(id, serviceSession);
      return successResponse(row);
    }

    if (action === 'change-flight') {
      const row = await bookingService.changeFlight(id, body, serviceSession);
      return successResponse(row);
    }

    if (action === 'accept-reaccommodation') {
      const row = await bookingService.acceptReaccommodation(id, body, serviceSession);
      return successResponse(row);
    }

    if (action === 'cancel-reaccommodation') {
      const row = await bookingService.cancelForReaccommodation(id, body, serviceSession);
      return successResponse(row);
    }

    return errorResponse(
      'Unsupported action. Use: cancel | change-flight | accept-reaccommodation | cancel-reaccommodation',
      400,
    );
  } catch (err) {
    if (err instanceof ZodError) return validationErrorResponse(zodFieldErrors(err));
    if (err instanceof NotFoundError) return errorResponse(err.message, 404);
    if (err instanceof UnauthorizedError) return unauthorizedResponse();
    if (err instanceof ConflictError) return errorResponse(err.message, 409);
    if (err instanceof BadRequestError) return errorResponse(err.message, 400);

    console.error('[PATCH /api/v1/bookings/[id]]', err);
    return errorResponse('Internal server error');
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession();
    if (!session?.user) return unauthorizedResponse();

    const limited = enforceApiRateLimit({
      headers: req.headers,
      namespace: 'api:v1:bookings:id',
      userId: session.user.id,
      action: 'write',
    });
    if (!limited.ok) return tooManyRequestsResponse(limited.retryAfterMs);

    const { id } = await params;
    const row = await bookingService.cancelBooking(id, {
      user: { id: session.user.id, role: session.user.role },
    });

    return successResponse(row);
  } catch (err) {
    if (err instanceof NotFoundError) return errorResponse(err.message, 404);
    if (err instanceof UnauthorizedError) return unauthorizedResponse();
    if (err instanceof ConflictError) return errorResponse(err.message, 409);
    console.error('[DELETE /api/v1/bookings/[id]]', err);
    return errorResponse('Internal server error');
  }
}
