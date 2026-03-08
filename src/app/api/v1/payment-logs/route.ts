import { NextRequest } from 'next/server';
import { ZodError } from 'zod';
import { NotFoundError, ConflictError, UnauthorizedError, BadRequestError } from '@/lib/errors';
import { paymentLogService } from '@/services/payment-log.services';
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
      namespace: 'api:v1:payment-logs',
      userId: session.user.id,
      action: 'read',
    });
    if (!limited.ok) return tooManyRequestsResponse(limited.retryAfterMs);

    const bookingId = req.nextUrl.searchParams.get('bookingId');
    const page = Number(req.nextUrl.searchParams.get('page') ?? 1);
    const limit = Number(req.nextUrl.searchParams.get('limit') ?? 20);
    const serviceSession = { user: { id: session.user.id, role: session.user.role } };

    if (bookingId) {
      const rows = await paymentLogService.findByBookingId(bookingId, serviceSession);
      return successResponse(rows);
    }

    const result = await paymentLogService.findAllPaginated(serviceSession, { page, limit });
    return successResponse(result);
  } catch (err) {
    if (err instanceof UnauthorizedError) return unauthorizedResponse();
    if (err instanceof NotFoundError) return errorResponse(err.message, 404);
    console.error('[GET /api/v1/payment-logs]', err);
    return errorResponse('Internal server error');
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) return unauthorizedResponse();

    const limited = enforceApiRateLimit({
      headers: req.headers,
      namespace: 'api:v1:payment-logs',
      userId: session.user.id,
      action: 'write',
    });
    if (!limited.ok) return tooManyRequestsResponse(limited.retryAfterMs);

    const body = await req.json();
    const created = await paymentLogService.create(body, {
      user: { id: session.user.id, role: session.user.role },
    });

    return successResponse(created, 201);
  } catch (err) {
    if (err instanceof ZodError) return validationErrorResponse(zodFieldErrors(err));
    if (err instanceof UnauthorizedError) return unauthorizedResponse();
    if (err instanceof NotFoundError) return errorResponse(err.message, 404);
    console.error('[POST /api/v1/payment-logs]', err);
    return errorResponse('Internal server error');
  }
}
